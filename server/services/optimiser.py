"""Optimiser public API — small delegator to split packers for readability.

This module preserves the original `pack(...)` function signature while
delegating rectangular and irregular packing to smaller modules.
"""

from typing import List, Dict, Any

from ._optimiser_common import _IRREGULAR_DEPS_OK
from .rect_packer import pack_rectangles
from .irregular_packer import pack_irregular


def pack(
    pieces: List[Dict[str, Any]],
    sheet_width: int,
    sheet_height: int,
    allow_rotation: bool = True,
    kerf: int = 0,
    packing_mode: str = "heuristic",
) -> Dict[str, Any]:
    """Bin-pack rectangular or polygon pieces into as many sheets as needed.

    Behaviour kept identical to the original implementation. Uses
    `pack_irregular` when irregular pieces are present and shapely is
    available; otherwise falls back to bounding-box packing using
    `pack_rectangles`.
    """
    if sheet_width <= 0 or sheet_height <= 0:
        raise ValueError("Sheet size must be positive")

    contains_polygons = any("polygon" in p for p in pieces)
    if contains_polygons:
        if _IRREGULAR_DEPS_OK:
            return pack_irregular(
                pieces, sheet_width, sheet_height, allow_rotation, kerf, packing_mode
            )
        # Fallback: convert polygons into bounding boxes and pack as rectangles
        rect_like = []
        for p in pieces:
            if "polygon" in p and p["polygon"]:
                xs = [pt[0] for pt in p["polygon"]]
                ys = [pt[1] for pt in p["polygon"]]
                w = max(xs) - min(xs)
                h = max(ys) - min(ys)
                rect_like.append(
                    {
                        "id": p["id"],
                        "width": int(round(w)),
                        "height": int(round(h)),
                        "name": p.get("name"),
                    }
                )
            else:
                rect_like.append(p)
        result = pack_rectangles(
            rect_like, sheet_width, sheet_height, allow_rotation, kerf
        )
        for s in result["sheets"]:
            s.setdefault("polygons", [])
        return result
    else:
        return pack_rectangles(pieces, sheet_width, sheet_height, allow_rotation, kerf)
