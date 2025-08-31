from typing import List
import json

from fastapi import APIRouter, Body, Query, HTTPException
from sqlmodel import Session, select

from db import engine
from models import Job, Cabinet, Piece, PlacementGroup, Placement, Sheet
from fastapi.responses import StreamingResponse
from services.cutsheet_export import (
    cutsheet_by_sheet_to_pdf_bytes,
    cutsheet_by_sheet_to_csv_bytes,
    cutsheet_by_sheet_to_xlsx_bytes,
)
import re

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


def _sanitize_filename(s: str) -> str:
    if not s:
        return "job"
    name = s.strip()
    name = re.sub(r"[^\w\s-]", "", name)
    name = re.sub(r"[\s]+", "-", name)
    return name.strip("-")[:100]


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


@router.get("/jobs/{pid}/cutsheet.pdf")
def export_job_cutsheet_pdf(pid: str):
    # Use most recent placement group; error if none
    with Session(engine) as s:
        job = s.get(Job, pid)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        pg = s.exec(
            select(PlacementGroup)
            .where(PlacementGroup.job_id == pid)
            .order_by(PlacementGroup.date.desc())
        ).first()
        if not pg:
            raise HTTPException(
                status_code=400, detail="No placement exists for this job"
            )
        placements = s.exec(
            select(Placement).where(Placement.placement_group_id == pg.id)
        ).all()
        if not placements:
            raise HTTPException(
                status_code=400, detail="No placement exists for this job"
            )
        piece_ids = {pl.piece_id for pl in placements}
        pieces = s.exec(select(Piece).where(Piece.id.in_(piece_ids))).all()
        sheet_ids = {pl.sheet_id for pl in placements}
        sheets = s.exec(select(Sheet).where(Sheet.id.in_(sheet_ids))).all()
        cabinets = s.exec(select(Cabinet).where(Cabinet.job_id == pid)).all()
        cabs_by_id = {c.id: c for c in cabinets}

    # Build rows grouped by sheet index (per placement), not sheet_id
    piece_by_id = {p.id: p for p in pieces}
    # Map sheet_id -> sheet record for dimensions/name lookup
    sheet_by_id = {sh.id: sh for sh in sheets}
    rows_by_sheet: dict = {}
    sheet_meta_map = {}
    for pl in placements:
        p = piece_by_id.get(pl.piece_id)
        if not p:
            continue
        idx = getattr(pl, "sheet_index", None) or 1
        if idx not in sheet_meta_map:
            sh = sheet_by_id.get(pl.sheet_id)
            sheet_meta_map[idx] = {
                "id": idx,
                "name": getattr(sh, "name", None),
                "width": getattr(sh, "width", None),
                "height": getattr(sh, "height", None),
                "index": idx,
            }
        row = {
            "id": p.id,
            "name": p.name,
            "width": p.width,
            "height": p.height,
            "cabinet_name": (
                cabs_by_id.get(p.cabinet_id).name if p.cabinet_id in cabs_by_id else ""
            ),
        }
        if p.points_json:
            try:
                row["polygon"] = json.loads(p.points_json)
            except Exception:
                row["polygon"] = None
        rows_by_sheet.setdefault(idx, []).append(row)

    sheet_meta = [sheet_meta_map[k] for k in sorted(sheet_meta_map.keys())]

    pdf_bytes = cutsheet_by_sheet_to_pdf_bytes(
        job_name=job.name or job.id,
        sheets=sheet_meta,
        rows_by_sheet=rows_by_sheet,
        title="Cut Sheet",
    )
    filename = f"{_sanitize_filename(job.name)}-cutsheet.pdf"
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "X-Filename": filename,
        },
    )


@router.get("/jobs/{pid}/cutsheet.csv")
def export_job_cutsheet_csv(pid: str):
    with Session(engine) as s:
        job = s.get(Job, pid)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        pg = s.exec(
            select(PlacementGroup)
            .where(PlacementGroup.job_id == pid)
            .order_by(PlacementGroup.date.desc())
        ).first()
        if not pg:
            raise HTTPException(
                status_code=400, detail="No placement exists for this job"
            )
        placements = s.exec(
            select(Placement).where(Placement.placement_group_id == pg.id)
        ).all()
        if not placements:
            raise HTTPException(
                status_code=400, detail="No placement exists for this job"
            )
        piece_ids = {pl.piece_id for pl in placements}
        pieces = s.exec(select(Piece).where(Piece.id.in_(piece_ids))).all()
        sheet_ids = {pl.sheet_id for pl in placements}
        sheets = s.exec(select(Sheet).where(Sheet.id.in_(sheet_ids))).all()
        cabinets = s.exec(select(Cabinet).where(Cabinet.job_id == pid)).all()
        cabs_by_id = {c.id: c for c in cabinets}

    rows_by_sheet: dict = {}
    piece_by_id = {p.id: p for p in pieces}
    sheet_by_id = {sh.id: sh for sh in sheets}
    sheet_meta_map = {}
    for pl in placements:
        p = piece_by_id.get(pl.piece_id)
        if not p:
            continue
        idx = getattr(pl, "sheet_index", None) or 1
        if idx not in sheet_meta_map:
            sh = sheet_by_id.get(pl.sheet_id)
            sheet_meta_map[idx] = {
                "id": idx,
                "name": getattr(sh, "name", None),
                "width": getattr(sh, "width", None),
                "height": getattr(sh, "height", None),
                "index": idx,
            }
        row = {
            "id": p.id,
            "name": p.name,
            "width": p.width,
            "height": p.height,
            "cabinet_name": (
                cabs_by_id.get(p.cabinet_id).name if p.cabinet_id in cabs_by_id else ""
            ),
        }
        if p.points_json:
            try:
                row["polygon"] = json.loads(p.points_json)
            except Exception:
                row["polygon"] = None
        rows_by_sheet.setdefault(idx, []).append(row)
    sheet_meta = [sheet_meta_map[k] for k in sorted(sheet_meta_map.keys())]
    csv_bytes = cutsheet_by_sheet_to_csv_bytes(sheet_meta, rows_by_sheet)
    filename = f"{_sanitize_filename(job.name)}-cutsheet.csv"
    return StreamingResponse(
        iter([csv_bytes]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "X-Filename": filename,
        },
    )


@router.get("/jobs/{pid}/cutsheet.xlsx")
def export_job_cutsheet_xlsx(pid: str):
    with Session(engine) as s:
        job = s.get(Job, pid)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        pg = s.exec(
            select(PlacementGroup)
            .where(PlacementGroup.job_id == pid)
            .order_by(PlacementGroup.date.desc())
        ).first()
        if not pg:
            raise HTTPException(
                status_code=400, detail="No placement exists for this job"
            )
        placements = s.exec(
            select(Placement).where(Placement.placement_group_id == pg.id)
        ).all()
        if not placements:
            raise HTTPException(
                status_code=400, detail="No placement exists for this job"
            )
        piece_ids = {pl.piece_id for pl in placements}
        pieces = s.exec(select(Piece).where(Piece.id.in_(piece_ids))).all()
        sheet_ids = {pl.sheet_id for pl in placements}
        sheets = s.exec(select(Sheet).where(Sheet.id.in_(sheet_ids))).all()
        cabinets = s.exec(select(Cabinet).where(Cabinet.job_id == pid)).all()
        cabs_by_id = {c.id: c for c in cabinets}

    rows_by_sheet: dict = {}
    piece_by_id = {p.id: p for p in pieces}
    sheet_by_id = {sh.id: sh for sh in sheets}
    sheet_meta_map = {}
    for pl in placements:
        p = piece_by_id.get(pl.piece_id)
        if not p:
            continue
        idx = getattr(pl, "sheet_index", None) or 1
        if idx not in sheet_meta_map:
            sh = sheet_by_id.get(pl.sheet_id)
            sheet_meta_map[idx] = {
                "id": idx,
                "name": getattr(sh, "name", None),
                "width": getattr(sh, "width", None),
                "height": getattr(sh, "height", None),
                "index": idx,
            }
        row = {
            "id": p.id,
            "name": p.name,
            "width": p.width,
            "height": p.height,
            "cabinet_name": (
                cabs_by_id.get(p.cabinet_id).name if p.cabinet_id in cabs_by_id else ""
            ),
        }
        if p.points_json:
            try:
                row["polygon"] = json.loads(p.points_json)
            except Exception:
                row["polygon"] = None
        rows_by_sheet.setdefault(idx, []).append(row)
    sheet_meta = [sheet_meta_map[k] for k in sorted(sheet_meta_map.keys())]
    xlsx_bytes = cutsheet_by_sheet_to_xlsx_bytes(sheet_meta, rows_by_sheet)
    filename = f"{_sanitize_filename(job.name)}-cutsheet.xlsx"
    return StreamingResponse(
        iter([xlsx_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "X-Filename": filename,
        },
    )
