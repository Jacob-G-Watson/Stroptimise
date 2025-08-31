import json
import pytest

from services.optimiser import pack, _IRREGULAR_DEPS_OK


def test_l_shape_placement():
    pieces = [
        {
            "id": "L1",
            "name": "L",
            "polygon": [[0, 0], [200, 0], [200, 50], [50, 50], [50, 200], [0, 200]],
        },
        {
            "id": "rect1",
            "name": "R",
            "width": 100,
            "height": 80,
        },
    ]
    res = pack(pieces, sheet_width=400, sheet_height=300, allow_rotation=True, kerf=4)
    assert "sheets" in res
    sheets = res["sheets"]
    assert len(sheets) >= 1
    # polygon entry exists if deps installed
    if _IRREGULAR_DEPS_OK:
        assert any(s.get("polygons") for s in sheets)
    # rect still present as bbox list
    assert any(s.get("rects") for s in sheets)
