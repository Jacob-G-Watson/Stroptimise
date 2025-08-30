from fastapi import FastAPI, HTTPException, Query, Body
from pydantic import BaseModel
from typing import List, Optional
from sqlmodel import SQLModel, Session, create_engine, select
from models import Job, Sheet, Piece, Placement
from services.optimiser import pack

engine = create_engine(
    "sqlite:///db.sqlite3", connect_args={"check_same_thread": False}
)

app = FastAPI()


# Add piece to a cabinet
@app.post("/api/cabinets/{cid}/pieces")
def add_piece_to_cabinet(cid: str, data: dict = Body(...)):
    from models import Piece, PiecePolygon

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
            poly = PiecePolygon(
                piece_id=piece.id, points_json=__import__("json").dumps(polygon)
            )
            s.add(poly)
            s.commit()
        s.refresh(piece)
        return piece


# Add cabinet to a job
@app.post("/api/jobs/{pid}/cabinets")
def add_cabinet(pid: int, data: dict = Body(...)):
    from models import Cabinet

    name = data.get("name")
    cabinet = Cabinet(job_id=pid, name=name)
    with Session(engine) as s:
        s.add(cabinet)
        s.commit()
        s.refresh(cabinet)
        return cabinet


# User login endpoint
from models import User


@app.post("/api/users/login")
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


@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)


# Get cabinets for a job
@app.get("/api/jobs/{pid}/cabinets")
def get_job_cabinets(pid: int):
    from models import Cabinet

    with Session(engine) as s:
        cabinets = s.exec(select(Cabinet).where(Cabinet.job_id == pid)).all()
        return cabinets


# Get pieces for a cabinet
@app.get("/api/cabinets/{cid}/pieces")
def get_cabinet_pieces(cid: str):
    from models import Piece, PiecePolygon

    with Session(engine) as s:
        pieces = s.exec(select(Piece).where(Piece.cabinet_id == cid)).all()
        # attach polygon if exists
        out = []
        for p in pieces:
            poly = s.exec(
                select(PiecePolygon).where(PiecePolygon.piece_id == p.id)
            ).first()
            item = {
                "id": p.id,
                "cabinet_id": p.cabinet_id,
                "colour_id": p.colour_id,
                "name": p.name,
                "width": p.width,
                "height": p.height,
            }
            if poly:
                item["polygon"] = __import__("json").loads(poly.points_json)
            out.append(item)
        return out


@app.get("/api/jobs")
def list_jobs(user_id: str = Query(None)):
    with Session(engine) as s:
        query = select(Job)
        if user_id:
            query = query.where(Job.user_id == user_id)
        jobs = s.exec(query).all()
        return jobs


@app.post("/api/jobs")
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


@app.get("/api/jobs/{pid}/pieces")
def get_job_pieces(pid: int):
    # Return pieces that belong to any cabinet associated with the given job
    from models import Cabinet

    with Session(engine) as s:
        cabinets = s.exec(select(Cabinet).where(Cabinet.job_id == pid)).all()
        if not cabinets:
            return []
        cab_ids = [c.id for c in cabinets if c.id is not None]
        if not cab_ids:
            return []
        pieces = s.exec(select(Piece).where(Piece.cabinet_id.in_(cab_ids))).all()
        from models import PiecePolygon

        out = []
        for p in pieces:
            poly = s.exec(
                select(PiecePolygon).where(PiecePolygon.piece_id == p.id)
            ).first()
            item = {
                "id": p.id,
                "cabinet_id": p.cabinet_id,
                "colour_id": p.colour_id,
                "name": p.name,
                "width": p.width,
                "height": p.height,
            }
            if poly:
                item["polygon"] = __import__("json").loads(poly.points_json)
            out.append(item)
        return out


@app.post("/api/jobs/{pid}/pieces")
def add_pieces(pid: int, pieces: list[Piece]):
    for pc in pieces:
        pc.job_id = pid
    with Session(engine) as s:
        s.add_all(pieces)
        s.commit()
        return pieces


# -------- Layout endpoint --------
class LayoutRequest(BaseModel):
    sheet_width: int
    sheet_height: int
    allow_rotation: Optional[bool] = None
    kerf_mm: Optional[int] = None
    packing_mode: Optional[str] = "heuristic"  # "heuristic" or "exhaustive"


@app.post("/api/jobs/{pid}/layout")
def compute_job_layout(pid: int, body: LayoutRequest):
    # 1) Collect all pieces belonging to the job's cabinets
    from models import Cabinet

    with Session(engine) as s:
        job = s.get(Job, pid)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        cabinets = s.exec(select(Cabinet).where(Cabinet.job_id == pid)).all()
        if not cabinets:
            return {"sheets": []}
        cab_ids = [c.id for c in cabinets if c.id]
        if not cab_ids:
            return {"sheets": []}
        pieces = s.exec(select(Piece).where(Piece.cabinet_id.in_(cab_ids))).all()

    # 2) Map to rects or polygons for the optimiser
    rects_or_polys = []
    with Session(engine) as s:
        from models import PiecePolygon

        for p in pieces:
            poly = s.exec(
                select(PiecePolygon).where(PiecePolygon.piece_id == p.id)
            ).first()
            if poly:
                rects_or_polys.append(
                    {
                        "id": p.id,
                        "name": getattr(p, "name", None),
                        "polygon": __import__("json").loads(poly.points_json),
                    }
                )
            else:
                rects_or_polys.append(
                    {
                        "id": p.id,
                        "name": getattr(p, "name", None),
                        "width": p.width,
                        "height": p.height,
                    }
                )

    allow_rotation = body.allow_rotation
    if allow_rotation is None:
        allow_rotation = bool(job.allow_rotation)
    kerf = body.kerf_mm if body.kerf_mm is not None else (job.kerf_mm or 0)

    try:
        result = pack(
            rects_or_polys,
            sheet_width=body.sheet_width,
            sheet_height=body.sheet_height,
            allow_rotation=allow_rotation,
            kerf=kerf or 0,
            packing_mode=body.packing_mode or "heuristic",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result
