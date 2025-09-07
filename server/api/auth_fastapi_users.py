"""
NOTE: Refresh token rotation & CSRF handling from previous implementation are
removed (explicitly requested: no backwards compatibility). If you later need
long-lived sessions, enable fastapi-users' optional refresh token strategy or
implement cookie-based transport.
"""

from typing import Optional
from fastapi import Depends
from fastapi_users import FastAPIUsers
from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    JWTStrategy,
)
from fastapi_users.db import BaseUserDatabase
from sqlmodel import Session, select

from db import engine
from models import User, RefreshToken
import os
import logging
import secrets

TOKEN_ENCRYPTION_KEY = os.getenv("JWT_SECRET")
if not TOKEN_ENCRYPTION_KEY:
    logging.getLogger("auth").error(
        "JWT_SECRET environment variable is missing; application will not start. Please set JWT_SECRET to a secure value."
    )
    raise RuntimeError(
        "JWT_SECRET environment variable is required for authentication."
    )

# Database adapter ---------------------------------------------------------


def get_session():
    with Session(engine) as session:
        yield session


from sqlalchemy import func


class SyncUserDatabase(BaseUserDatabase[User, str]):
    """Custom user DB adapter using synchronous SQLModel Session.

    Wraps sync operations in async method signatures expected by fastapi-users.
    """

    def __init__(self, session: Session):  # type: ignore[misc]
        self.session = session

    async def get(self, id: str) -> Optional[User]:  # type: ignore[override]
        return self.session.get(User, id)

    async def get_by_email(self, email: str) -> Optional[User]:  # type: ignore[override]
        statement = select(User).where(func.lower(User.email) == func.lower(email))
        return self.session.exec(statement).first()

    async def get_by_oauth_account(self, oauth: str, account_id: str):  # type: ignore[override]
        raise NotImplementedError()

    async def create(self, create_dict: dict) -> User:  # type: ignore[override]
        user = User(**create_dict)
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user

    async def update(self, user: User, update_dict: dict) -> User:  # type: ignore[override]
        for k, v in update_dict.items():
            setattr(user, k, v)
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user

    async def delete(self, user: User) -> None:  # type: ignore[override]
        self.session.delete(user)
        self.session.commit()

    async def add_oauth_account(self, user, create_dict):  # type: ignore[override]
        raise NotImplementedError()

    async def update_oauth_account(self, user, oauth_account, update_dict):  # type: ignore[override]
        raise NotImplementedError()


async def get_user_db(session: Session = Depends(get_session)):
    yield SyncUserDatabase(session)


# Auth backend -------------------------------------------------------------

bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")


def get_jwt_strategy() -> JWTStrategy:
    # 15 minute access tokens (same as original)
    return JWTStrategy(secret=TOKEN_ENCRYPTION_KEY, lifetime_seconds=15 * 60)


auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)


# User manager -------------------------------------------------------------
from fastapi_users import schemas, exceptions as fau_exceptions
from fastapi_users.manager import BaseUserManager


class UserRead(schemas.BaseUser[str]):  # string IDs
    name: str


class UserCreate(schemas.BaseUserCreate):  # type: ignore[misc]
    name: str


class UserUpdate(schemas.BaseUserUpdate):  # type: ignore[misc]
    name: Optional[str] = None


class UserManager(BaseUserManager[User, str]):
    reset_password_token_secret = TOKEN_ENCRYPTION_KEY
    verification_token_secret = TOKEN_ENCRYPTION_KEY

    # fastapi-users requires parse_id for non-UUID custom ID types; ours are strings
    def parse_id(self, id: str) -> str:  # type: ignore[override]
        return id

    async def create(
        self, user_create: UserCreate, safe: bool = False, request=None
    ) -> User:
        # Enforce unique email using the existing user DB adapter to avoid
        # creating an extra Session/connection. The adapter implements
        # `get_by_email` and uses the same underlying session.
        existing = await self.user_db.get_by_email(user_create.email)  # type: ignore[attr-defined]
        if existing is not None:
            raise fau_exceptions.UserAlreadyExists()
        return await super().create(user_create, safe, request)


async def get_user_manager(user_db=Depends(get_user_db)):
    yield UserManager(user_db)


fastapi_users = FastAPIUsers[User, str](get_user_manager, [auth_backend])

# Routers to plug into app -------------------------------------------------
auth_router = fastapi_users.get_auth_router(auth_backend, requires_verification=False)
register_router = fastapi_users.get_register_router(UserRead, UserCreate)
users_router = fastapi_users.get_users_router(UserRead, UserUpdate)
verify_router = fastapi_users.get_verify_router(UserRead)
reset_router = fastapi_users.get_reset_password_router()

# Dependency for protected endpoints (replacement for previous get_current_user)
current_active_user = fastapi_users.current_user(active=True)

# ---------------------------------------------------------------------------
# Refresh token (opaque, stored in DB) for automatic renewal of short-lived
# JWT access tokens. Simplified version of the previous custom implementation.
# ---------------------------------------------------------------------------

from fastapi import APIRouter, HTTPException, Response, Request
from sqlmodel import select
from datetime import datetime, timedelta, timezone
import secrets

REFRESH_TTL_DAYS = int(os.getenv("REFRESH_TTL_DAYS", "7"))
REFRESH_COOKIE_NAME = os.getenv("REFRESH_COOKIE_NAME", "refresh_token")
SECURE_COOKIES = os.getenv("COOKIE_SECURE", "true").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").lower()

refresh_router = APIRouter()
me_router = APIRouter()


def _set_refresh_cookie(response: Response, token: str):
    validated_samesite = (
        COOKIE_SAMESITE if COOKIE_SAMESITE in {"lax", "strict", "none"} else "lax"
    )
    if validated_samesite == "none" and not SECURE_COOKIES:
        validated_samesite = "lax"
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=SECURE_COOKIES,
        samesite=validated_samesite,
        max_age=REFRESH_TTL_DAYS * 86400,
        path="/",
    )


async def _issue_refresh_token(user: User, response: Response):
    jti = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(days=REFRESH_TTL_DAYS)
    with Session(engine) as s:  # type: ignore
        rt = RefreshToken(jti=jti, user_id=user.id, expires_at=expires)
        s.add(rt)
        s.commit()
    _set_refresh_cookie(response, jti)


@refresh_router.post("/bootstrap")
async def bootstrap_refresh_token(
    response: Response, user: User = Depends(current_active_user)
):
    """Call immediately after login to set initial refresh cookie."""
    await _issue_refresh_token(user, response)
    return {"status": "ok"}


@refresh_router.post("")
async def refresh_access_token(request: Request, response: Response):
    jti = request.cookies.get(REFRESH_COOKIE_NAME)
    if not jti:
        raise HTTPException(status_code=401, detail="Missing refresh token")
    with Session(engine) as s:  # type: ignore
        rt = s.exec(select(RefreshToken).where(RefreshToken.jti == jti)).first()
        if not rt or rt.revoked:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        if rt.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Expired refresh token")
        user = s.get(User, rt.user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        # rotate: revoke old, create new
        rt.revoked = True
        s.add(rt)
        s.commit()
        await _issue_refresh_token(user, response)
    # issue new access token
    access_token = await get_jwt_strategy().write_token(user)  # type: ignore
    return {"access_token": access_token, "token_type": "bearer", "expires_in": 15 * 60}


@me_router.get("/users/me")
async def read_me(user: User = Depends(current_active_user)):
    return {"id": user.id, "name": user.name, "email": user.email}


# Aggregate all auth-related routers so the application can mount a single router.
combined_auth_router = APIRouter()
combined_auth_router.include_router(auth_router, prefix="/auth/jwt")
combined_auth_router.include_router(register_router, prefix="/auth")
combined_auth_router.include_router(verify_router, prefix="/auth")
combined_auth_router.include_router(reset_router, prefix="/auth")
combined_auth_router.include_router(refresh_router, prefix="/auth/refresh")
combined_auth_router.include_router(users_router)  # user management endpoints
combined_auth_router.include_router(me_router)  # /users/me endpoint
