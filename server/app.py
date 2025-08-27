from fastapi import FastAPI, HTTPException
from sqlmodel import SQLModel, Session, create_engine, select
from models import Project, Sheet, Piece, Placement
from services.optimizer import pack

engine = create_engine(
    "sqlite:///db.sqlite3", connect_args={"check_same_thread": False}
)
app = FastAPI()


@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)


@app.post("/api/projects")
def create_project(p: Project):
    with Session(engine) as s:
        s.add(p)
        s.commit()
        s.refresh(p)
        return p


@app.post("/api/projects/{pid}/sheets")
def add_sheets(pid: int, sheets: list[Sheet]):
    for i, sh in enumerate(sheets):
        sh.project_id = pid
        sh.sequence = i
    with Session(engine) as s:
        s.add_all(sheets)
        s.commit()
        return sheets


@app.post("/api/projects/{pid}/pieces")
def add_pieces(pid: int, pieces: list[Piece]):
    for pc in pieces:
        pc.project_id = pid
    with Session(engine) as s:
        s.add_all(pieces)
        s.commit()
        return pieces


@app.post("/api/projects/{pid}/optimize")
def optimize(pid: int):
    with Session(engine) as s:
        project = s.exec(select(Project).where(Project.id == pid)).one()
        sheets = s.exec(select(Sheet).where(Sheet.project_id == pid)).all()
        pieces = s.exec(select(Piece).where(Piece.project_id == pid)).all()
        if not sheets or not pieces:
            raise HTTPException(400, "Sheets and pieces required")
        placements = pack(project, sheets, pieces)
        by_seq = {sh.sequence: sh.id for sh in sheets}
        rows = []
        for pl in placements:
            rows.append(
                Placement(
                    project_id=pid,
                    sheet_id=by_seq.get(pl["bin_index"], sheets[0].id),
                    piece_id=pl["piece_id"],
                    x=pl["x"],
                    y=pl["y"],
                    w=pl["w"],
                    h=pl["h"],
                    rotated=pl["rotated"],
                )
            )
        s.add_all(rows)
        s.commit()
        tot_area = sum(sh.width * sh.height for sh in sheets)
        used_area = sum(r.w * r.h for r in rows)
        return {"placements": rows, "utilization": {"overall": used_area / tot_area}}
