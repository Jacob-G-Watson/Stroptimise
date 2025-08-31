import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException
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

router = APIRouter()


class LayoutRequest(BaseModel):
    sheet_width: int
    sheet_height: int
    allow_rotation: Optional[bool] = None
    kerf_mm: Optional[int] = None
    packing_mode: Optional[str] = "heuristic"  # "heuristic" or "exhaustive"


@router.post("/jobs/{pid}/layout")
def compute_job_layout(pid: str, body: LayoutRequest):
    # 1) Collect all pieces belonging to the job's cabinets
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
    for p in pieces:
        if p.points_json:
            rects_or_polys.append(
                {
                    "id": p.id,
                    "name": getattr(p, "name", None),
                    "polygon": json.loads(p.points_json),
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

    # Determine allow_rotation and kerf using job defaults if not provided
    allow_rotation = body.allow_rotation
    if allow_rotation is None:
        allow_rotation = bool(getattr(job, "allow_rotation", True))
    kerf = (
        body.kerf_mm if body.kerf_mm is not None else (getattr(job, "kerf_mm", 0) or 0)
    )

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
        for sheet in result.get("sheets", []):
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
            # Save placements for rects
            for rect in sheet.get("rects", []):
                placement = Placement(
                    placement_group_id=placement_group.id,
                    sheet_id=sheet_id,
                    piece_id=rect["piece_id"],
                    x=rect["x"],
                    y=rect["y"],
                    w=rect["w"],
                    h=rect["h"],
                    angle=rect.get("angle", 0),
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
                )
                placements.append(placement)
        s.add_all(placements)
        s.commit()

    return result
