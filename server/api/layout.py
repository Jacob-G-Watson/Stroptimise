import json
from datetime import datetime
import logging
from typing import Optional
import re

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from db import engine
from models import (
    Job,
    Cabinet,
    Piece,
    Placement,
    PlacementGroup,
    Sheet,
)
from services.optimiser import pack
from services.export import sheets_to_pdf_bytes

from .auth_fastapi_users import current_active_user


logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(current_active_user)])


def _sanitize_filename(s: str) -> str:
    if not s:
        return "job"
    name = s.strip()
    # Remove characters that aren't word chars, spaces or hyphens
    name = re.sub(r"[^\w\s-]", "", name)
    # Collapse whitespace to single dash
    name = re.sub(r"[\s]+", "-", name)
    # Trim leading/trailing dashes and limit length
    return name.strip("-")[:100]


class LayoutRequest(BaseModel):
    sheet_width: int
    sheet_height: int
    allow_rotation: Optional[bool] = None
    kerf_mm: Optional[int] = None
    packing_mode: Optional[str] = "heuristic"  # "heuristic" or "exhaustive"


@router.post("/jobs/{pid}/layout")
def compute_job_layout(pid: str, body: LayoutRequest):

    job, result = retrieve_and_pack_cabinets(pid, body)

    # Save PlacementGroup and Placements
    with Session(engine) as s:
        # Create PlacementGroup
        placement_group = PlacementGroup(
            optimise_method=body.packing_mode or "heuristic",
            date=datetime.utcnow(),
            job_id=pid,
        )
        s.add(placement_group)
        s.commit()  # To get placement_group.id

        # Save sheets if needed and placements
        placements = []
        for idx, sheet in enumerate(result.get("sheets", []), start=1):
            # Try to find the sheet in DB, or create if needed
            db_sheet = s.exec(
                select(Sheet)
                .where(Sheet.width == sheet["width"])
                .where(Sheet.height == sheet["height"])  # noqa: E501
            ).first()
            if db_sheet:
                sheet_id = db_sheet.id
            else:
                # TODO hardcoded placeholder because we don't have user sheets yet
                default_name = f"Auto {sheet['width']}x{sheet['height']}"
                placeholder_colour_id = "placeholder-colour-id"
                new_sheet = Sheet(
                    name=default_name,
                    colour_id=placeholder_colour_id,
                    width=sheet["width"],
                    height=sheet["height"],
                )
                s.add(new_sheet)
                s.commit()
                sheet_id = new_sheet.id

            # Save placements for rects, skipping those that correspond to polygons
            poly_ids = {pg.get("piece_id") for pg in (sheet.get("polygons") or [])}
            for rect in sheet.get("rects", []):
                if rect.get("piece_id") in poly_ids:
                    continue
                placement = Placement(
                    placement_group_id=placement_group.id,
                    sheet_id=sheet_id,
                    piece_id=rect["piece_id"],
                    x=rect["x"],
                    y=rect["y"],
                    w=rect["w"],
                    h=rect["h"],
                    angle=rect.get("angle", 0),
                    sheet_index=idx,
                )
                placements.append(placement)
            # Save placements for polygons if present
            for poly in sheet.get("polygons", []):
                placement = Placement(
                    placement_group_id=placement_group.id,
                    sheet_id=sheet_id,
                    piece_id=poly["piece_id"],
                    x=0,  # Polygon placements may need more info
                    y=0,
                    w=0,
                    h=0,
                    angle=poly.get("angle", 0),
                    sheet_index=idx,
                )
                placements.append(placement)
        s.add_all(placements)
        s.commit()

    return result


@router.post("/jobs/{pid}/layout/export/pdf")
def export_job_layout_pdf(pid: str, body: LayoutRequest):
    # Reuse the same logic as compute_job_layout but return a PDF file.
    job, result = retrieve_and_pack_cabinets(pid, body)

    # Render to PDF bytes
    sanitized_name = _sanitize_filename(getattr(job, "name", None))
    title = f"{sanitized_name}-layout"
    pdf_bytes = sheets_to_pdf_bytes(result.get("sheets", []), title=title)
    filename = f"{sanitized_name}-layout.pdf"
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "X-Filename": filename,
        },
    )


def retrieve_and_pack_cabinets(pid, body):

    job, pieces = db_fetch_job_and_pieces(pid)

    allow_rotation = (
        body.allow_rotation
        if body.allow_rotation is not None
        else bool(getattr(job, "allow_rotation", True))
    )
    kerf = (
        body.kerf_mm if body.kerf_mm is not None else (getattr(job, "kerf_mm", 0) or 0)
    )

    try:
        result = pack(
            convert_pieces_to_shapes(pieces),
            sheet_width=body.sheet_width,
            sheet_height=body.sheet_height,
            allow_rotation=allow_rotation,
            kerf=kerf or 0,
            packing_mode=body.packing_mode or "heuristic",
        )
    except ValueError as e:
        # Log the exception with traceback and the error message
        logger.exception("Error during packing: %s", e)
        raise HTTPException(status_code=400, detail=str(e))
    return job, result


def convert_pieces_to_shapes(pieces):
    rectangles_or_polygons = []
    for p in pieces:
        if p.points_json:
            rectangles_or_polygons.append(
                {
                    "id": p.id,
                    "name": getattr(p, "name", None),
                    "polygon": json.loads(p.points_json),
                }
            )
        else:
            rectangles_or_polygons.append(
                {
                    "id": p.id,
                    "name": getattr(p, "name", None),
                    "width": p.width,
                    "height": p.height,
                }
            )

    return rectangles_or_polygons


def db_fetch_job_and_pieces(pid):
    with Session(engine) as db_session:
        job = db_session.get(Job, pid)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        cabinets = db_session.exec(select(Cabinet).where(Cabinet.job_id == pid)).all()
        if not cabinets:
            raise HTTPException(status_code=400, detail="No cabinets for this job")

        cab_ids = [c.id for c in cabinets if c.id]
        if not cab_ids:
            raise HTTPException(status_code=400, detail="No cabinets for this job")
        pieces = db_session.exec(
            select(Piece).where(Piece.cabinet_id.in_(cab_ids))
        ).all()

    return job, pieces
