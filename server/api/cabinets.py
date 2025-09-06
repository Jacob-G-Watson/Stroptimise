import json
from fastapi import APIRouter, Body, HTTPException, Depends
from sqlmodel import Session, select

from db import engine
from models import Cabinet, Piece

from .auth import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.post("/cabinets/{cid}/pieces")
def add_piece_to_cabinet(cid: str, data: dict = Body(...)):
    name = data.get("name")
    width = data.get("width")
    height = data.get("height")
    polygon = data.get("polygon")  # [[x,y], ...]
    if polygon and (width is None or height is None):
        # derive bbox for width/height to maintain compatibility
        xs = [pt[0] for pt in polygon]
        ys = [pt[1] for pt in polygon]
        width = int(round(max(xs) - min(xs)))
        height = int(round(max(ys) - min(ys)))
    piece = Piece(cabinet_id=cid, width=width, height=height)
    if name is not None:
        piece.name = name
    with Session(engine) as s:
        s.add(piece)
        s.commit()
        s.refresh(piece)
        if polygon:
            # store inline on the piece
            piece.points_json = json.dumps(polygon)
            s.add(piece)
            s.commit()
        s.refresh(piece)
        return piece


@router.post("/jobs/{pid}/cabinets")
def add_cabinet(pid: str, data: dict = Body(...)):
    name = data.get("name")
    cabinet = Cabinet(job_id=pid, name=name)
    with Session(engine) as s:
        s.add(cabinet)
        s.commit()
        s.refresh(cabinet)
        return cabinet


@router.get("/jobs/{pid}/cabinets")
def get_job_cabinets(pid: str):
    with Session(engine) as s:
        cabinets = s.exec(select(Cabinet).where(Cabinet.job_id == pid)).all()
        return cabinets


@router.delete("/cabinets/{cid}")
def delete_cabinet(cid: str):
    with Session(engine) as s:
        cab = s.get(Cabinet, cid)
        if not cab:
            raise HTTPException(status_code=404, detail="Cabinet not found")
        # Delete pieces that belong to this cabinet to avoid orphans
        pieces = s.exec(select(Piece).where(Piece.cabinet_id == cid)).all()
        for p in pieces:
            s.delete(p)
        s.delete(cab)
        s.commit()
        return {"status": "deleted", "id": cid}
