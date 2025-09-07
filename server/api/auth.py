import os
import time
import hmac
import json
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, Request, Response, APIRouter, Cookie
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import secrets
import logging
from sqlmodel import Session
from argon2 import PasswordHasher, exceptions as argon_exc
import jwt

from db import engine
from models import User, RefreshToken


# Configuration & env
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALG = "HS256"
ACCESS_TTL_MINUTES = 15
REFRESH_TTL_DAYS = 7
CSRF_COOKIE_NAME = "csrf_token"
REFRESH_COOKIE_NAME = "refresh_token"
JWT_TOKEN_ISSUER = os.getenv("JWT_TOKEN_ISSUER")
JWT_TOKEN_AUDIENCE = os.getenv("JWT_TOKEN_AUDIENCE")
SECURE_COOKIES = os.getenv("COOKIE_SECURE", "true").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").lower()
APP_ENV = os.getenv("APP_ENV", "dev").lower()

if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET not set. Create a .env file (see .env.example) and define a strong secret."
    )

password_hasher = PasswordHasher()
security = HTTPBearer(auto_error=False)
router = APIRouter()

# In-memory rate limiter (IP+username) -> list[timestamps]
_rate_window_seconds = 60
_rate_limit = 10
_rate_data: dict[tuple[str, str], list[float]] = {}


def _now() -> float:
    return time.time()


def check_rate_limit(ip: str, username: str):
    key = (ip, username or "")
    bucket = _rate_data.setdefault(key, [])
    cutoff = _now() - _rate_window_seconds
    # prune
    while bucket and bucket[0] < cutoff:
        bucket.pop(0)
    if len(bucket) >= _rate_limit:
        raise HTTPException(
            status_code=429, detail="Too many login attempts. Try later."
        )
    bucket.append(_now())


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(stored_hash: str, password: str) -> bool:
    try:
        return password_hasher.verify(stored_hash, password)
    except argon_exc.VerifyMismatchError:
        return False
    except argon_exc.VerificationError:
        return False


# Token helpers


def create_access_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user.id,
        "name": user.name,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ACCESS_TTL_MINUTES)).timestamp()),
        "type": "access",
        "iss": JWT_TOKEN_ISSUER,
        "aud": JWT_TOKEN_AUDIENCE,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def create_refresh_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user.id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=REFRESH_TTL_DAYS)).timestamp()),
        "type": "refresh",
        "jti": secrets.token_hex(8),
        "iss": JWT_TOKEN_ISSUER,
        "aud": JWT_TOKEN_AUDIENCE,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def persist_refresh_token(
    token_jti: str, user: User, expires_at: datetime, device_info: str | None = None
):
    # store token record so we can revoke/rotate
    from sqlmodel import Session

    # ensure expiry is timezone-aware (UTC)
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    with Session(engine) as s:
        rt = RefreshToken(
            jti=token_jti,
            user_id=user.id,
            expires_at=expires_at,
            device_info=device_info,
        )
        s.add(rt)
        s.commit()


def _ensure_aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def decode_token(token: str) -> dict:
    """Decode a JWT.

    Backwards compatible: if audience/issuer claims absent (older tokens), we don't fail solely on that.
    After a grace period you can enforce by passing audience= and options.
    """
    try:
        data = jwt.decode(
            token, JWT_SECRET, algorithms=[JWT_ALG], options={"verify_aud": False}
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    # Soft validation of iss/aud if present
    if (iss := data.get("iss")) and iss != JWT_TOKEN_ISSUER:
        raise HTTPException(status_code=401, detail="Invalid issuer")
    if (aud := data.get("aud")) and aud != JWT_TOKEN_AUDIENCE:
        raise HTTPException(status_code=401, detail="Invalid audience")
    return data


async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> User:
    if not creds or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Missing credentials")
    data = decode_token(creds.credentials)
    if data.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user_id = data.get("sub")
    with Session(engine) as s:
        user = s.get(User, user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user


# CSRF token


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)


# Refresh endpoint
@router.post("/auth/refresh")
async def refresh_access_token(
    response: Response,
    request: Request,
    refresh_token: Optional[str] = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    csrf_token: Optional[str] = Cookie(default=None, alias=CSRF_COOKIE_NAME),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Missing refresh token")
    # Double submit: header must match cookie
    header_token = request.headers.get("X-CSRF-Token")
    if (
        not header_token
        or not csrf_token
        or not hmac.compare_digest(header_token, csrf_token)
    ):
        raise HTTPException(status_code=403, detail="CSRF token mismatch")
    data = decode_token(refresh_token)
    if data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    sub = data.get("sub")
    jti = data.get("jti")
    from sqlmodel import Session, select

    logger = logging.getLogger("auth")

    with Session(engine) as s:
        refresh_token = s.exec(
            select(RefreshToken).where(RefreshToken.jti == jti)
        ).first()
        rt_expires = _ensure_aware(refresh_token.expires_at) if refresh_token else None
        if not refresh_token:
            raise HTTPException(status_code=401, detail="Refresh token invalid")
        if refresh_token.revoked:
            # Reuse detection: revoke all sessions for this user as defensive action
            sessions = s.exec(
                select(RefreshToken).where(
                    RefreshToken.user_id == refresh_token.user_id
                )
            ).all()
            for sess in sessions:
                if not sess.revoked:
                    sess.revoked = True
                    s.add(sess)
            s.commit()
            logger.warning(
                f"refresh_reuse_detected user_id={refresh_token.user_id} reused_jti={refresh_token.jti} total_revoked={len(sessions)}"
            )
            raise HTTPException(status_code=401, detail="Refresh token reuse detected")
        if rt_expires and rt_expires < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Refresh token expired")

        user = s.get(User, sub)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        # rotate: mark current as revoked and issue new one
        refresh_token.revoked = True
        s.add(refresh_token)
        new_refresh = create_refresh_token(user)
        new_data = decode_token(new_refresh)
        expires_ts = datetime.fromtimestamp(new_data.get("exp"), tz=timezone.utc)
        new_jti = new_data.get("jti")
        new_rt = RefreshToken(jti=new_jti, user_id=user.id, expires_at=expires_ts)
        s.add(new_rt)
        s.commit()
        access = create_access_token(user)
        csrf = generate_csrf_token()
        set_refresh_and_csrf_cookies(response, new_refresh, csrf)
        response.headers["Cache-Control"] = "no-store"
        return {
            "access_token": access,
            "token_type": "bearer",
            "expires_in": ACCESS_TTL_MINUTES * 60,
        }


# Utility for setting cookies


def set_refresh_and_csrf_cookies(
    response: Response, refresh_token: str, csrf_token: str
):
    secure_flag = SECURE_COOKIES
    samesite = (
        COOKIE_SAMESITE if COOKIE_SAMESITE in {"lax", "strict", "none"} else "lax"
    )
    # If SameSite=None must be secure
    if samesite == "none" and not secure_flag:
        samesite = "lax"
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=secure_flag,
        samesite=samesite,
        max_age=REFRESH_TTL_DAYS * 86400,
        path="/",
    )
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=csrf_token,
        httponly=False,
        secure=secure_flag,
        samesite=samesite,
        max_age=REFRESH_TTL_DAYS * 86400,
        path="/",
    )


@router.post("/auth/logout")
def logout(request: Request, response: Response):
    """Require CSRF token header and revoke the refresh token present in the cookie."""
    csrf_token = request.cookies.get(CSRF_COOKIE_NAME)
    header_token = request.headers.get("X-CSRF-Token")
    if (
        not csrf_token
        or not header_token
        or not hmac.compare_digest(csrf_token, header_token)
    ):
        raise HTTPException(status_code=403, detail="CSRF token mismatch")

    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if refresh_token:
        try:
            data = decode_token(refresh_token)
            jti = data.get("jti")
            from sqlmodel import Session, select

            with Session(engine) as s:
                rt = s.exec(select(RefreshToken).where(RefreshToken.jti == jti)).first()
                if rt:
                    rt.revoked = True
                    s.add(rt)
                    s.commit()
        except Exception:
            # ignore token decode errors, still clear cookies
            pass

    response.delete_cookie(key=REFRESH_COOKIE_NAME, path="/")
    response.delete_cookie(key=CSRF_COOKIE_NAME, path="/")
    logging.getLogger("auth").info("logout")
    return {"status": "logged_out"}


@router.get("/auth/sessions")
def list_sessions(current: User = Depends(get_current_user)):
    """Return active refresh token sessions for the current user."""
    from sqlmodel import Session, select

    with Session(engine) as s:
        rows = s.exec(
            select(RefreshToken).where(RefreshToken.user_id == current.id)
        ).all()
        out = []
        for r in rows:
            out.append(
                {
                    "jti": r.jti,
                    "issued_at": r.issued_at.isoformat(),
                    "expires_at": r.expires_at.isoformat(),
                    "revoked": bool(r.revoked),
                    "device_info": r.device_info,
                }
            )
        return out


@router.post("/auth/sessions/revoke")
def revoke_session(data: dict, current: User = Depends(get_current_user)):
    """Revoke a specific refresh token (by jti) or all tokens for the user.

    Payload: {"jti": "..."} or {"all": true}
    """
    from sqlmodel import Session, select

    jti = data.get("jti")
    all_flag = data.get("all")
    with Session(engine) as s:
        if all_flag:
            rows = s.exec(
                select(RefreshToken).where(RefreshToken.user_id == current.id)
            ).all()
            for r in rows:
                r.revoked = True
                s.add(r)
            s.commit()
            return {"revoked": "all"}
        if not jti:
            raise HTTPException(status_code=400, detail="Missing jti or all flag")
        rt = s.exec(
            select(RefreshToken).where(
                RefreshToken.jti == jti, RefreshToken.user_id == current.id
            )
        ).first()
        if not rt:
            raise HTTPException(status_code=404, detail="session not found")
        rt.revoked = True
        s.add(rt)
        s.commit()
        return {"revoked": jti}
