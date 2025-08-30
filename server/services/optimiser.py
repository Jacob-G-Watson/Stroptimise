from rectpack import newPacker, GuillotineBafSas
from typing import List, Dict, Any


def pack(
    pieces: List[Dict[str, Any]],
    sheet_width: int,
    sheet_height: int,
    allow_rotation: bool = True,
    kerf: int = 0,
) -> Dict[str, Any]:
    """
    Bin-pack rectangular pieces into as many sheets as needed.

    Inputs
    - pieces: list of {id: str, width: int, height: int, name?: str}
    - sheet_width, sheet_height: dimensions of a single sheet
    - allow_rotation: whether rectangles may be rotated 90 degrees
    - kerf: padding to apply around each piece (mm) to account for cut width

    Output
    - {
            sheets: [
              { index: int, width: int, height: int,
                    rects: [ { piece_id, name, x, y, w, h, rotated } ]
              }
            ]
      }
    """
    if sheet_width <= 0 or sheet_height <= 0:
        raise ValueError("Sheet size must be positive")

    # Map id -> original dims/name for post-processing
    id_map = {
        p["id"]: {
            "w": int(p["width"]),
            "h": int(p["height"]),
            "name": p.get("name"),
        }
        for p in pieces
    }

    packer = newPacker(rotation=allow_rotation, pack_algo=GuillotineBafSas)

    # Add rectangles; apply kerf as padding around each piece (simple approximation)
    for p in pieces:
        w = int(p["width"]) + kerf
        h = int(p["height"]) + kerf
        rid = p["id"]
        packer.add_rect(w, h, rid=rid)

    # Add many bins of requested size; rectpack doesn't support infinite bins, use a safe upper bound
    packer.add_bin(int(sheet_width), int(sheet_height), count=100)

    packer.pack()

    # Gather placements grouped by bin index using rect_list()
    # rect_list entries: (bin_index, x, y, w, h, rid)
    sheets_map: Dict[int, Dict[str, Any]] = {}
    for bin_index, x, y, w, h, rid in packer.rect_list():
        if bin_index not in sheets_map:
            sheets_map[bin_index] = {
                "index": bin_index,
                "width": int(sheet_width),
                "height": int(sheet_height),
                "rects": [],
            }
        meta = id_map.get(rid, {})
        orig_w = meta.get("w", w)
        orig_h = meta.get("h", h)
        adj_w = max(1, int(w) - kerf)
        adj_h = max(1, int(h) - kerf)
        rotated = (adj_w == orig_h and adj_h == orig_w) if allow_rotation else False
        sheets_map[bin_index]["rects"].append(
            {
                "piece_id": rid,
                "name": meta.get("name") or rid,
                "x": int(x),
                "y": int(y),
                "w": int(adj_w),
                "h": int(adj_h),
                "rotated": bool(rotated),
            }
        )

    sheets = [sheets_map[i] for i in sorted(sheets_map.keys())]
    return {"sheets": sheets}
