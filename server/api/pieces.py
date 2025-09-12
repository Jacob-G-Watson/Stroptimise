import json
from fastapi import APIRouter, HTTPException, Depends, Body
from sqlmodel import Session, select

from db import engine
from models import Piece

from .auth_fastapi_users import current_active_user

router = APIRouter(dependencies=[Depends(current_active_user)])


@router.get("/cabinets/{cid}/pieces")
def get_cabinet_pieces(cid: str):
    with Session(engine) as s:
        pieces = s.exec(select(Piece).where(Piece.cabinet_id == cid)).all()
        # attach polygon if exists
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


@router.delete("/pieces/{pid}")
def delete_piece(pid: str):
    with Session(engine) as s:
        piece = s.get(Piece, pid)
        if not piece:
            raise HTTPException(status_code=404, detail="Piece not found")
        s.delete(piece)
        s.commit()
        return {"status": "deleted", "id": pid}


@router.patch("/pieces/{pid}")
def update_piece(pid: str, data: dict = Body(...)):
    """Update piece fields. Accepts name, width, height, polygon ([[x,y], ...]).
    If polygon is provided and width/height missing, derive bbox like add endpoint.
    """
    name = data.get("name")
    width = data.get("width")
    height = data.get("height")
    polygon = data.get("polygon")
    if polygon and (width is None or height is None):
        xs = [pt[0] for pt in polygon]
        ys = [pt[1] for pt in polygon]
        width = int(round(max(xs) - min(xs)))
        height = int(round(max(ys) - min(ys)))

    with Session(engine) as s:
        piece = s.get(Piece, pid)
        if not piece:
            raise HTTPException(status_code=404, detail="Piece not found")
        if name is not None:
            piece.name = name
        if width is not None:
            piece.width = width
        if height is not None:
            piece.height = height
        if polygon is not None:
            piece.points_json = json.dumps(polygon)
        s.add(piece)
        s.commit()
        s.refresh(piece)

        out = {
            "id": piece.id,
            "cabinet_id": piece.cabinet_id,
            "colour_id": piece.colour_id,
            "name": piece.name,
            "width": piece.width,
            "height": piece.height,
        }
        if piece.points_json:
            out["polygon"] = json.loads(piece.points_json)
        return out
