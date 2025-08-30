from fastapi import FastAPI, HTTPException, Query, Body
from sqlmodel import SQLModel, Session, create_engine, select
from models import Job, Sheet, Piece, Placement
from services.optimizer import pack

engine = create_engine(
    "sqlite:///db.sqlite3", connect_args={"check_same_thread": False}
)

app = FastAPI()


# Add piece to a cabinet
@app.post("/api/cabinets/{cid}/pieces")
def add_piece_to_cabinet(cid: str, data: dict = Body(...)):
    from models import Piece

    name = data.get("name")
    width = data.get("width")
    height = data.get("height")
    piece = Piece(cabinet_id=cid, width=width, height=height)
    # Optionally add name if Piece model supports it
    if name is not None:
        piece.name = name
    with Session(engine) as s:
        s.add(piece)
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
    from models import Piece

    with Session(engine) as s:
        pieces = s.exec(select(Piece).where(Piece.cabinet_id == cid)).all()
        return pieces


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
        return pieces


@app.post("/api/jobs/{pid}/pieces")
def add_pieces(pid: int, pieces: list[Piece]):
    for pc in pieces:
        pc.job_id = pid
    with Session(engine) as s:
        s.add_all(pieces)
        s.commit()
        return pieces


@app.post("/api/jobs/{pid}/optimise")
def optimise(pid: int, data: dict = Body(...)):
    from types import SimpleNamespace
    from models import Cabinet

    with Session(engine) as s:
        job = s.exec(select(Job).where(Job.id == pid)).one()

        sheets_payload = data.get("sheets") if isinstance(data, dict) else None

        # Always load pieces via cabinets associated with the job
        cabinets = s.exec(select(Cabinet).where(Cabinet.job_id == pid)).all()
        cab_ids = [c.id for c in cabinets if c.id is not None]
        pieces = []
        if cab_ids:
            pieces = s.exec(select(Piece).where(Piece.cabinet_id.in_(cab_ids))).all()

        if (
            sheets_payload
            and isinstance(sheets_payload, list)
            and len(sheets_payload) > 0
        ):
            # Use sheets passed from frontend (do not persist placements)
            sheets_for_pack = []
            for i, sh in enumerate(sheets_payload):
                w = int(sh.get("width") or sh.get("w") or 0)
                h = int(sh.get("height") or sh.get("h") or 0)
                if w <= 0 or h <= 0:
                    continue
                # create a lightweight object with width/height attributes
                sheets_for_pack.append(
                    SimpleNamespace(width=w, height=h, sequence=i, id=None)
                )

            if not sheets_for_pack or not pieces:
                raise HTTPException(
                    400, "Sheets (in request) and pieces (on job) are required"
                )

            pack_result = pack(job, sheets_for_pack, pieces)
            # pack now returns a dict: { placements: [...], bins_used: n }
            placements = (
                pack_result.get("placements", [])
                if isinstance(pack_result, dict)
                else pack_result
            )
            bins_used = (
                pack_result.get("bins_used", None)
                if isinstance(pack_result, dict)
                else None
            )

            tot_area = sum(s.width * s.height for s in sheets_for_pack)
            used_area = sum(p["w"] * p["h"] for p in placements)
            resp = {
                "placements": placements,
                "utilization": {"overall": used_area / tot_area},
                "bins_used": bins_used,
            }

            return resp

        # Do not fall back to stored sheets - require sheets in request body
        raise HTTPException(
            400, "Sheets must be provided in the request body for optimisation"
        )
