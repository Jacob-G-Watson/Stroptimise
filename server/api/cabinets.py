import json
from fastapi import APIRouter, Body, HTTPException, Depends
from sqlmodel import Session, select

from db import engine
from models import Cabinet, Piece, UserCabinet, UserPiece, User

from .auth_fastapi_users import current_active_user

router = APIRouter(dependencies=[Depends(current_active_user)])


def _derive_bbox_if_needed(data: dict):
    width = data.get("width")
    height = data.get("height")
    polygon = data.get("polygon")
    if polygon and (width is None or height is None):
        xs = [pt[0] for pt in polygon]
        ys = [pt[1] for pt in polygon]
        width = int(round(max(xs) - min(xs)))
        height = int(round(max(ys) - min(ys)))
    return width, height, polygon


def _add_piece(container_field: str, piece_model, container_id: str, data: dict):
    name = data.get("name")
    width, height, polygon = _derive_bbox_if_needed(data)
    kwargs = {container_field: container_id, "width": width, "height": height}
    piece = piece_model(**kwargs)
    if name is not None:
        piece.name = name
    if polygon is not None:
        piece.points_json = json.dumps(polygon)
    with Session(engine) as s:
        s.add(piece)
        s.commit()
        s.refresh(piece)
        return piece


@router.post("/cabinets/{cid}/pieces")
def add_piece_to_cabinet(cid: str, data: dict = Body(...)):
    return _add_piece("cabinet_id", Piece, cid, data)


@router.post("/user_cabinets/{ucid}/pieces")
def add_piece_to_user_cabinet(ucid: str, data: dict = Body(...)):
    return _add_piece("user_cabinet_id", UserPiece, ucid, data)


def _create_cabinet(model, fk_name: str, fk_value: str, data: dict):
    name = data.get("name")
    kwargs = {fk_name: fk_value, "name": name}
    cabinet = model(**kwargs)
    with Session(engine) as s:
        s.add(cabinet)
        s.commit()
        s.refresh(cabinet)
        return cabinet


@router.post("/jobs/{pid}/cabinets")
def add_cabinet(pid: str, data: dict = Body(...)):
    return _create_cabinet(Cabinet, "job_id", pid, data)


@router.post("/users/{uid}/cabinets")
def add_user_cabinet(uid: str, data: dict = Body(...)):
    return _create_cabinet(UserCabinet, "user_id", uid, data)


@router.get("/cabinets/{cid}")
def get_cabinet(cid: str):
    """Fetch a single job-scoped cabinet by id."""
    with Session(engine) as s:
        cab = s.get(Cabinet, cid)
        if not cab:
            raise HTTPException(status_code=404, detail="Cabinet not found")
        return cab


@router.get("/jobs/{pid}/cabinets")
def get_job_cabinets(pid: str):
    with Session(engine) as s:
        cabinets = s.exec(select(Cabinet).where(Cabinet.job_id == pid)).all()
        return cabinets


@router.get("/users/{uid}/cabinets")
def get_user_cabinets(uid: str):
    with Session(engine) as s:
        cabinets = s.exec(select(UserCabinet).where(UserCabinet.user_id == uid)).all()
        return cabinets


def _delete_cabinet(
    model, piece_model, piece_field: str, cid: str, not_found_message: str
):
    with Session(engine) as s:
        cab = s.get(model, cid)
        if not cab:
            raise HTTPException(status_code=404, detail=not_found_message)
        pieces = s.exec(
            select(piece_model).where(getattr(piece_model, piece_field) == cid)
        ).all()
        for p in pieces:
            s.delete(p)
        s.delete(cab)
        s.commit()
        return {"status": "deleted", "id": cid}


@router.delete("/cabinets/{cid}")
def delete_cabinet(cid: str):
    return _delete_cabinet(Cabinet, Piece, "cabinet_id", cid, "Cabinet not found")


@router.delete("/user_cabinets/{ucid}")
def delete_user_cabinet(ucid: str):
    return _delete_cabinet(
        UserCabinet, UserPiece, "user_cabinet_id", ucid, "UserCabinet not found"
    )


@router.patch("/cabinets/{cid}")
def update_cabinet(cid: str, data: dict = Body(...)):
    """Update mutable fields of a job cabinet (currently only name)."""
    with Session(engine) as s:
        cab = s.get(Cabinet, cid)
        if not cab:
            raise HTTPException(status_code=404, detail="Cabinet not found")
        name = data.get("name")
        if name is not None:
            cab.name = name
        s.add(cab)
        s.commit()
        s.refresh(cab)
        return cab


@router.patch("/user_cabinets/{ucid}")
def update_user_cabinet(
    ucid: str, data: dict = Body(...), user: User = Depends(current_active_user)
):
    with Session(engine) as s:
        cab = s.get(UserCabinet, ucid)
        if not cab:
            raise HTTPException(status_code=404, detail="UserCabinet not found")
        if cab.user_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        name = data.get("name")
        if name is not None:
            cab.name = name
        s.add(cab)
        s.commit()
        s.refresh(cab)
        return cab


@router.post("/jobs/{pid}/import_user_cabinet/{ucid}")
def import_user_cabinet_to_job(
    pid: str, ucid: str, user: User = Depends(current_active_user)
):
    with Session(engine) as s:
        ucab = s.get(UserCabinet, ucid)
        if not ucab:
            raise HTTPException(status_code=404, detail="UserCabinet not found")
        if ucab.user_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        new_name = f"Copy of {ucab.name}"
        new_cab = Cabinet(name=new_name, job_id=pid)
        s.add(new_cab)
        s.commit()
        s.refresh(new_cab)
        # Fetch user pieces and clone
        pieces = s.exec(
            select(UserPiece).where(UserPiece.user_cabinet_id == ucid)
        ).all()
        for up in pieces:
            piece = Piece(
                cabinet_id=new_cab.id,
                name=up.name,
                width=up.width,
                height=up.height,
                points_json=up.points_json,
                colour_id=up.colour_id,
            )
            s.add(piece)
        s.commit()
        return new_cab
