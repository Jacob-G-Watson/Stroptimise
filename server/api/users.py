from fastapi import APIRouter, HTTPException, Request, Response, Depends
from sqlmodel import Session, select

from db import engine
from models import User
from .auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    set_refresh_and_csrf_cookies,
    generate_csrf_token,
    check_rate_limit,
    get_current_user,
)
import logging
from ipaddress import ip_address

logger = logging.getLogger("auth")
if not logger.handlers:
    h = logging.FileHandler("auth.log")
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
    h.setFormatter(fmt)
    logger.addHandler(h)
logger.setLevel(logging.INFO)

router = APIRouter()


@router.post("/users/login")
def login(data: dict, request: Request, response: Response):
    name = data.get("name", "").strip()
    password = data.get("password", "")
    client_ip = request.client.host if request.client else "unknown"
    # Rate limiting
    try:
        check_rate_limit(client_ip, name)
    except HTTPException as e:
        logger.warning(f"rate_limit_exceeded ip={client_ip} user={name}")
        raise e
    with Session(engine) as s:
        user = s.exec(select(User).where(User.name == name)).first()
        if (
            not user
            or not user.password_hash
            or not verify_password(user.password_hash, password)
        ):
            # Dummy verify to equalize timing
            try:
                verify_password(hash_password("dummy"), password)
            except Exception:
                pass
            logger.info(f"login_fail ip={client_ip} user={name}")
            raise HTTPException(status_code=401, detail="Invalid username or password")
        access = create_access_token(user)
        refresh = create_refresh_token(user)
        csrf = generate_csrf_token()
        set_refresh_and_csrf_cookies(response, refresh, csrf)
        logger.info(f"login_success ip={client_ip} user_id={user.id} user={name}")
        response.headers["Cache-Control"] = "no-store"
        return {
            "access_token": access,
            "token_type": "bearer",
            "expires_in": 15 * 60,
            "user": {"id": user.id, "name": user.name},
        }


@router.post("/users", status_code=201)
def create_user(data: dict, request: Request, response: Response):
    """Minimal signup: create a new user with a hashed password and return tokens.

    This mirrors the login flow by issuing access/refresh tokens and setting
    the refresh & CSRF cookies so the frontend can immediately authenticate.
    """
    name = data.get("name", "").strip()
    password = data.get("password", "")
    client_ip = request.client.host if request.client else "unknown"

    # Basic validation
    if not name or not password:
        raise HTTPException(status_code=400, detail="Username and password required")

    # Rate limiting to avoid automated account creation abuse
    try:
        check_rate_limit(client_ip, name)
    except HTTPException as e:
        logger.warning(f"rate_limit_exceeded ip={client_ip} user={name}")
        raise e

    with Session(engine) as s:
        existing = s.exec(select(User).where(User.name == name)).first()
        if existing:
            raise HTTPException(status_code=400, detail="User already exists")
        # Hash and store password
        pw_hash = hash_password(password)
        user = User(name=name, password_hash=pw_hash)
        s.add(user)
        s.commit()
        s.refresh(user)

        # Issue tokens and set cookies as in login
        access = create_access_token(user)
        refresh = create_refresh_token(user)
        csrf = generate_csrf_token()
        set_refresh_and_csrf_cookies(response, refresh, csrf)
        logger.info(f"signup_success ip={client_ip} user_id={user.id} user={name}")
        response.headers["Cache-Control"] = "no-store"
        return {
            "access_token": access,
            "token_type": "bearer",
            "expires_in": 15 * 60,
            "user": {"id": user.id, "name": user.name},
        }


@router.get("/users/me")
def get_me(current: User = Depends(get_current_user)):
    return {"id": current.id, "name": current.name}
