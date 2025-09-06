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
from sqlmodel import Session, select
from argon2 import PasswordHasher, exceptions as argon_exc
import jwt

from db import engine
from models import User

# Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "dev-insecure-change-me")
JWT_ALG = "HS256"
ACCESS_TTL_MINUTES = 15
REFRESH_TTL_DAYS = 7
CSRF_COOKIE_NAME = "csrf_token"
REFRESH_COOKIE_NAME = "refresh_token"

ph = PasswordHasher()
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
    return ph.hash(password)


def verify_password(stored_hash: str, password: str) -> bool:
    try:
        return ph.verify(stored_hash, password)
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
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


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
    with Session(engine) as s:
        user = s.get(User, sub)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(user)
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
    secure_flag = True  # assume behind HTTPS termination in production
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=secure_flag,
        samesite="strict",
        max_age=REFRESH_TTL_DAYS * 86400,
        path="/api/auth/refresh",
    )
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=csrf_token,
        httponly=False,  # must be readable by JS to send via header
        secure=secure_flag,
        samesite="strict",
        max_age=REFRESH_TTL_DAYS * 86400,
        path="/",
    )


@router.post("/auth/logout")
def logout(response: Response):
    """Clear refresh & CSRF cookies so client must re-authenticate."""
    secure_flag = True
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path="/api/auth/refresh")
    response.delete_cookie(key=CSRF_COOKIE_NAME, path="/")
    logging.getLogger("auth").info("logout")
    return {"status": "logged_out"}
