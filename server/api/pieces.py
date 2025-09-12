import json
from fastapi import APIRouter, HTTPException, Depends, Body
from sqlmodel import Session, select

from db import engine
from models import Piece, UserPiece

from .auth_fastapi_users import current_active_user

router = APIRouter(dependencies=[Depends(current_active_user)])


def _serialize_piece_obj(p, container_key: str):
    """Serialize a piece (Piece or UserPiece) to a dict using container_key
    which should be either 'cabinet_id' or 'user_cabinet_id'."""
    out = {
        "id": p.id,
        container_key: getattr(p, container_key),
        "colour_id": p.colour_id,
        "name": p.name,
        "width": p.width,
        "height": p.height,
    }
    if p.points_json:
        out["polygon"] = json.loads(p.points_json)
    return out


def _list_pieces_by_field(model, field_name: str, value: str, container_key: str):
    with Session(engine) as s:
        pieces = s.exec(select(model).where(getattr(model, field_name) == value)).all()
        return [_serialize_piece_obj(p, container_key) for p in pieces]


def _delete_piece_by_model(model, pid: str, not_found_message: str):
    with Session(engine) as s:
        piece = s.get(model, pid)
        if not piece:
            raise HTTPException(status_code=404, detail=not_found_message)
        s.delete(piece)
        s.commit()
        return {"status": "deleted", "id": pid}


def _update_piece_generic(model, pid: str, data: dict, container_key: str):
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
        piece = s.get(model, pid)
        if not piece:
            raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
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
        return _serialize_piece_obj(piece, container_key)


@router.get("/cabinets/{cid}/pieces")
def get_cabinet_pieces(cid: str):
    return _list_pieces_by_field(Piece, "cabinet_id", cid, "cabinet_id")


@router.delete("/pieces/{pid}")
def delete_piece(pid: str):
    return _delete_piece_by_model(Piece, pid, "Piece not found")


@router.delete("/user_pieces/{pid}")
def delete_user_piece(pid: str):
    return _delete_piece_by_model(UserPiece, pid, "UserPiece not found")


@router.patch("/pieces/{pid}")
def update_piece(pid: str, data: dict = Body(...)):
    return _update_piece_generic(Piece, pid, data, "cabinet_id")


@router.patch("/user_pieces/{pid}")
def update_user_piece(pid: str, data: dict = Body(...)):
    return _update_piece_generic(UserPiece, pid, data, "user_cabinet_id")


@router.get("/user_cabinets/{ucid}/pieces")
def get_user_cabinet_pieces(ucid: str):
    return _list_pieces_by_field(UserPiece, "user_cabinet_id", ucid, "user_cabinet_id")
