from typing import List, Dict, Any
from math import ceil

from ._optimiser_common import (
    Polygon,
    box,
    shp_rotate,
    shp_translate,
    unary_union,
    pyclipper,
    _HAS_PYCLIPPER,
    _IRREGULAR_DEPS_OK,
)


def pack_irregular(
    pieces: List[Dict[str, Any]],
    sheet_width: int,
    sheet_height: int,
    allow_rotation: bool,
    kerf: int,
    packing_mode: str = "heuristic",
) -> Dict[str, Any]:
    """Pack polygon (irregular) pieces. Extracted from original _pack_irregular.

    Requires shapely (and optionally pyclipper) installed.
    """
    assert _IRREGULAR_DEPS_OK, "Shapely required for polygon packing"

    angle_step = 90 if not allow_rotation else 15
    angles = [a for a in range(0, 360, angle_step)] if allow_rotation else [0]

    sheet_poly = box(0, 0, sheet_width, sheet_height)
    kerf_clearance = max(0.0, float(kerf) / 2.0)

    # Normalize inputs: build shapely polygons and meta
    norm_pieces = []
    for p in pieces:
        pid = p["id"]
        name = p.get("name") or pid
        if "polygon" in p and p["polygon"]:
            pts = [(float(x), float(y)) for x, y in p["polygon"]]
            poly = Polygon(pts)
            if not poly.is_valid:
                poly = poly.buffer(0)
        else:
            w = float(p["width"])
            h = float(p["height"])
            poly = box(0, 0, w, h)

        if poly.area <= 0:
            raise ValueError(f"Piece {pid} has non-positive area")

        inflated = _offset_polygon(poly, kerf_clearance) if kerf_clearance > 0 else poly

        norm_pieces.append(
            {
                "id": pid,
                "name": name,
                "base": poly,
                "inflated": inflated,
            }
        )

    norm_pieces.sort(key=lambda it: it["inflated"].area, reverse=True)

    sheets: List[Dict[str, Any]] = []

    # Helper to ensure a sheet has internal tracking lists
    def _ensure_internal(sheet: Dict[str, Any]):
        sheet.setdefault("_placed_inflated", [])
        sheet.setdefault("_candidates", [(0.0, 0.0)])
        return sheet

    # Start with one sheet
    sheets.append(_ensure_internal(_new_sheet(0, sheet_width, sheet_height)))

    for item in norm_pieces:
        placed = None
        target_sheet = None

        # Try to fit on any existing sheet before opening a new one
        for sh in sheets:
            placed_inflated = sh["_placed_inflated"]
            candidates = sh["_candidates"]
            if packing_mode == "simple":
                placed = _place_on_sheet_simple(
                    item, sheet_poly, placed_inflated, use_inflated=True
                )
            elif packing_mode == "exhaustive":
                placed = _place_on_sheet_exhaustive(
                    item, sheet_poly, placed_inflated, angles, use_inflated=True
                )
            else:
                placed = _place_on_sheet(
                    item,
                    sheet_poly,
                    placed_inflated,
                    candidates,
                    angles,
                    use_inflated=True,
                )
            if placed:
                target_sheet = sh
                break

        if not placed:
            # Need a new sheet
            new_sheet = _ensure_internal(
                _new_sheet(len(sheets), sheet_width, sheet_height)
            )
            sheets.append(new_sheet)
            placed_inflated = new_sheet["_placed_inflated"]
            candidates = new_sheet["_candidates"]
            if packing_mode == "simple":
                placed = _place_on_sheet_simple(
                    item, sheet_poly, placed_inflated, use_inflated=True
                )
            elif packing_mode == "exhaustive":
                placed = _place_on_sheet_exhaustive(
                    item, sheet_poly, placed_inflated, angles, use_inflated=True
                )
            else:
                placed = _place_on_sheet(
                    item,
                    sheet_poly,
                    placed_inflated,
                    candidates,
                    angles,
                    use_inflated=True,
                )
            if not placed:
                # Fallback: try without inflated clearance ONLY on the fresh empty sheet
                if packing_mode == "simple":
                    placed = _place_on_sheet_simple(
                        item, sheet_poly, placed_inflated, use_inflated=False
                    )
                elif packing_mode == "exhaustive":
                    placed = _place_on_sheet_exhaustive(
                        item, sheet_poly, placed_inflated, angles, use_inflated=False
                    )
                else:
                    placed = _place_on_sheet(
                        item,
                        sheet_poly,
                        placed_inflated,
                        candidates,
                        angles,
                        use_inflated=False,
                    )
                if not placed:
                    raise RuntimeError(
                        f"Failed to place piece {item['id']} on an empty sheet (check dimensions)"
                    )
            target_sheet = new_sheet

        base_abs, inflated_abs, angle_deg = placed
        target_sheet["_placed_inflated"].append(inflated_abs)

        coords = list(base_abs.exterior.coords)[:-1]
        target_sheet["polygons"].append(
            {
                "piece_id": item["id"],
                "name": item["name"],
                "angle": angle_deg,
                "points": [[int(round(x)), int(round(y))] for (x, y) in coords],
            }
        )

        minx, miny, maxx, maxy = base_abs.bounds
        target_sheet["rects"].append(
            {
                "piece_id": item["id"],
                "name": item["name"],
                "x": int(round(minx)),
                "y": int(round(miny)),
                "w": int(round(maxx - minx)),
                "h": int(round(maxy - miny)),
                "angle": int(angle_deg),
            }
        )

        # Update candidates for heuristic mode
        if packing_mode not in ("simple", "exhaustive"):
            bx_min, by_min, bx_max, by_max = inflated_abs.bounds
            target_sheet["_candidates"].extend([(bx_max, by_min), (bx_min, by_max)])
            target_sheet["_candidates"] = _prune_candidates(
                target_sheet["_candidates"], sheet_width, sheet_height
            )

    # Clean sheets for output (strip internal keys)
    cleaned = []
    for sh in sheets:
        cleaned.append(
            {
                k: v
                for k, v in sh.items()
                if not k.startswith("_")  # remove internal bookkeeping
            }
        )
    return {"sheets": cleaned}


# ---- helpers extracted directly ----


def _place_on_sheet(
    item, sheet_poly, placed_inflated, candidates, angles, use_inflated: bool = True
):
    best = None
    placed_union = unary_union(placed_inflated) if placed_inflated else None

    for angle in angles:
        base_rot = shp_rotate(item["base"], angle, origin=(0, 0), use_radians=False)
        inf_src = item["inflated"] if use_inflated else item["base"]
        inf_rot = shp_rotate(inf_src, angle, origin=(0, 0), use_radians=False)

        # Normalize so candidate refers to bbox bottom-left
        minx, miny, _, _ = inf_rot.bounds
        base_norm = shp_translate(base_rot, xoff=-minx, yoff=-miny)
        inf_norm = shp_translate(inf_rot, xoff=-minx, yoff=-miny)

        for cx, cy in candidates:
            base_abs = shp_translate(base_norm, xoff=cx, yoff=cy)
            inf_abs = shp_translate(inf_norm, xoff=cx, yoff=cy)

            # allow shapes touching boundary; contains() is strict, covers() includes boundary
            if not sheet_poly.covers(inf_abs):
                continue
            # Only block real overlaps (area > 0); allow edge/vertex touches
            if placed_union and inf_abs.intersection(placed_union).area > 0:
                continue

            # Prefer bottom-left (lower y, then lower x)
            bx, by, _, _ = inf_abs.bounds
            key = (by, bx)
            if best is None or key < best[0]:
                best = (key, (base_abs, inf_abs, angle))

    return None if best is None else best[1]


def _place_on_sheet_exhaustive(
    item,
    sheet_poly,
    placed_inflated,
    angles,
    use_inflated: bool = True,
    grid_step: int = 5,
):
    placed_union = unary_union(placed_inflated) if placed_inflated else None
    best = None

    for angle in angles:
        base_rot = shp_rotate(item["base"], angle, origin=(0, 0), use_radians=False)
        inf_src = item["inflated"] if use_inflated else item["base"]
        inf_rot = shp_rotate(inf_src, angle, origin=(0, 0), use_radians=False)

        # Normalize to origin bottom-left
        minx, miny, maxx, maxy = inf_rot.bounds
        base_norm = shp_translate(base_rot, xoff=-minx, yoff=-miny)
        inf_norm = shp_translate(inf_rot, xoff=-minx, yoff=-miny)
        w = maxx - minx
        h = maxy - miny
        max_x = max(0, int(ceil(sheet_poly.bounds[2] - w)))
        max_y = max(0, int(ceil(sheet_poly.bounds[3] - h)))

        y = 0
        while y <= max_y:
            x = 0
            while x <= max_x:
                base_abs = shp_translate(base_norm, xoff=x, yoff=y)
                inf_abs = shp_translate(inf_norm, xoff=x, yoff=y)

                if not sheet_poly.covers(inf_abs):
                    x += grid_step
                    continue
                if placed_union and inf_abs.intersection(placed_union).area > 0:
                    x += grid_step
                    continue

                # Found a valid placement; choose the first (row-major ~ bottom-left)
                key = (y, x)
                if best is None or key < best[0]:
                    best = (key, (base_abs, inf_abs, angle))
                    # we can early-return; but keep minimal to ensure most bottom-left
                    return best[1]

                x += grid_step
            y += grid_step

    return None


def _offset_polygon(poly: Any, delta: float) -> Any:
    if delta == 0:
        return poly
    # Prefer pyclipper if available for crisp miters; otherwise use shapely buffer
    if _HAS_PYCLIPPER:
        scale = 1000.0
        path = [
            (int(round(x * scale)), int(round(y * scale)))
            for (x, y) in list(poly.exterior.coords)[:-1]
        ]
        co = pyclipper.PyclipperOffset()
        co.AddPath(path, pyclipper.JT_MITER, pyclipper.ET_CLOSEDPOLYGON)
        out = co.Execute(int(round(delta * scale)))
        if not out:
            return poly
        out_path = max(out, key=lambda p: abs(pyclipper.Area(p)))
        out_pts = [(x / scale, y / scale) for (x, y) in out_path]
        return Polygon(out_pts).buffer(0)
    # shapely.buffer: join_style=2 => mitre (miter) similar to rect cuts
    try:
        return poly.buffer(delta, join_style=2)
    except Exception:
        return poly.buffer(delta)


def _new_sheet(index: int, w: int, h: int) -> Dict[str, Any]:
    return {
        "index": index,
        "width": int(w),
        "height": int(h),
        "rects": [],
        "polygons": [],
    }


def _prune_candidates(cands, sheet_w, sheet_h):
    # Keep unique and in-bounds candidates; snap negatives to zero
    seen = set()
    pruned = []
    for x, y in cands:
        x = 0.0 if x < 0 else x
        y = 0.0 if y < 0 else y
        if x > sheet_w or y > sheet_h:
            continue
        key = (round(x, 3), round(y, 3))
        if key in seen:
            continue
        seen.add(key)
        pruned.append((x, y))
    pruned.sort(key=lambda t: (t[1], t[0]))
    return pruned[:500]


def _place_on_sheet_simple(item, sheet_poly, placed_inflated, use_inflated=True):
    base_poly = item["base"]
    inflated_poly = item["inflated"] if use_inflated else base_poly

    # Try (0,0) first
    if use_inflated:
        if sheet_poly.covers(inflated_poly) and not any(
            inflated_poly.intersects(p) and inflated_poly.intersection(p).area > 0
            for p in placed_inflated
        ):
            return base_poly, inflated_poly, 0
    else:
        if sheet_poly.covers(base_poly) and not any(
            base_poly.intersects(p) and base_poly.intersection(p).area > 0
            for p in placed_inflated
        ):
            return base_poly, base_poly, 0

    step = 20
    for x in range(0, int(sheet_poly.bounds[2]), step):
        for y in range(0, int(sheet_poly.bounds[3]), step):
            translated = shp_translate(
                inflated_poly if use_inflated else base_poly, xoff=x, yoff=y
            )
            if use_inflated:
                if sheet_poly.covers(translated) and not any(
                    translated.intersects(p) and translated.intersection(p).area > 0
                    for p in placed_inflated
                ):
                    return shp_translate(base_poly, xoff=x, yoff=y), translated, 0
            else:
                if sheet_poly.covers(translated) and not any(
                    translated.intersects(p) and translated.intersection(p).area > 0
                    for p in placed_inflated
                ):
                    return translated, translated, 0

    return None
