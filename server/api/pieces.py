import json
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select

from db import engine
from models import Piece

from .auth import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


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
