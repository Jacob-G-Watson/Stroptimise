from typing import List
import json

from fastapi import APIRouter, Body, Query
from sqlmodel import Session, select

from db import engine
from models import Job, Cabinet, Piece

router = APIRouter()


@router.get("/jobs")
def list_jobs(user_id: str = Query(None)):
    with Session(engine) as s:
        query = select(Job)
        if user_id:
            query = query.where(Job.user_id == user_id)
        jobs = s.exec(query).all()
        return jobs


@router.post("/jobs")
def create_job(data: dict):
    job = Job(
        name=data.get("name"),
        kerf_mm=data.get("kerf_mm"),
        allow_rotation=data.get("allow_rotation", True),
        user_id=data.get("user_id"),
    )
    with Session(engine) as s:
        s.add(job)
        s.commit()
        s.refresh(job)
        return job


@router.get("/jobs/{pid}/pieces")
def get_job_pieces(pid: str):
    # Return pieces that belong to any cabinet associated with the given job
    with Session(engine) as s:
        cabinets = s.exec(select(Cabinet).where(Cabinet.job_id == pid)).all()
        if not cabinets:
            return []
        cab_ids = [c.id for c in cabinets if c.id is not None]
        if not cab_ids:
            return []
        pieces = s.exec(select(Piece).where(Piece.cabinet_id.in_(cab_ids))).all()
        out = []
        for p in pieces:
            item = {
                "id": p.id,
                "cabinet_id": p.cabinet_id,
                "colour_id": p.colour_id,
                "name": p.name,
                "width": p.width,
                "height": p.height,
            }
            if p.points_json:
                item["polygon"] = json.loads(p.points_json)
            out.append(item)
        return out


@router.post("/jobs/{pid}/pieces")
def add_pieces(pid: str, pieces: List[Piece]):
    for pc in pieces:
        pc.job_id = pid
    with Session(engine) as s:
        s.add_all(pieces)
        s.commit()
        return pieces
