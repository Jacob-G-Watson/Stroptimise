from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select

from db import engine
from models import User

router = APIRouter()


@router.post("/users/login")
def login(data: dict):
    name = data.get("name")
    password = data.get("password")
    with Session(engine) as s:
        user = s.exec(
            select(User).where(User.name == name, User.password == password)
        ).first()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        return user
