from rectpack import newPacker, GuillotineBafSas
import math

KERF_DEFAULT = 0


def pack(project, sheets, pieces):
    """Pack pieces into sheets.

    - project: object with attributes kerf_mm (int|None) and allow_rotation (bool)
    - sheets: iterable with .width and .height attributes (ints/strings)
    - pieces: iterable with .width, .height and optional .quantity, .id
    Returns: list of placement dicts: {bin_index, piece_id, x, y, w, h, rotated}
    """
    kerf = getattr(project, "kerf_mm", None) or KERF_DEFAULT
    allow_rotation = bool(getattr(project, "allow_rotation", True))

    packer = newPacker(
        pack_algo=GuillotineBafSas,
        rotation=allow_rotation,
    )

    # Build list of rectangles (pieces) with adjusted sizes and compute total area
    rects = []
    total_piece_area = 0
    for p in pieces:
        qty = int(getattr(p, "quantity", 1) or 1)
        pw = max(1, int(getattr(p, "width", 0)) + kerf)
        ph = max(1, int(getattr(p, "height", 0)) + kerf)
        rid = getattr(p, "id", None)
        rects.append((pw, ph, rid, qty))
        total_piece_area += pw * ph * qty

    # Compute total sheet area (using adjusted sheet sizes) and estimate required multiplier
    sheet_areas = []
    for s in sheets:
        sw = max(1, int(getattr(s, "width", 0)) - kerf)
        sh = max(1, int(getattr(s, "height", 0)) - kerf)
        sheet_areas.append((sw, sh))

    total_sheet_area = sum(sw * sh for sw, sh in sheet_areas) if sheet_areas else 0
    if total_sheet_area <= 0:
        # fallback: add a single default bin if sheets invalid
        for sw, sh in sheet_areas:
            packer.add_bin(sw, sh, count=1)
    else:
        # multiplier: how many repeats of the provided sheet set are needed to cover total piece area
        multiplier = max(1, math.ceil(total_piece_area / total_sheet_area))
        # add bins: replicate each provided sheet `multiplier` times
        for sw, sh in sheet_areas:
            packer.add_bin(sw, sh, count=multiplier)

    # Add rectangles (pieces) to packer
    for pw, ph, rid, qty in rects:
        for _ in range(qty):
            packer.add_rect(pw, ph, rid=rid)
    packer.pack()
    placements = []
    for bi, abin in enumerate(packer):
        for rect in abin:
            x, y, w, h, rid = rect.x, rect.y, rect.width, rect.height, rect.rid
            # We don't have a reliable rotation flag from rectpack here; keep False
            rotated = False
            fw, fh = max(1, int(w) - kerf), max(1, int(h) - kerf)
            placements.append(
                {
                    "bin_index": bi,
                    "piece_id": rid,
                    "x": int(x),
                    "y": int(y),
                    "w": fw,
                    "h": fh,
                    "rotated": rotated,
                }
            )

    # compute number of bins actually used (0 if no placements)
    if placements:
        bins_used = max(int(p.get("bin_index", 0)) for p in placements) + 1
    else:
        bins_used = 0

    return {"placements": placements, "bins_used": bins_used}
