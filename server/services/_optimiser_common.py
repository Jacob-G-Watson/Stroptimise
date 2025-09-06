"""Shared detection and optional dependency imports for the optimiser.

This module centralises the optional imports (shapely, pyclipper) so the
packers can import the same symbols without repeating detection logic.
"""

from typing import Any

# Optional deps for irregular nesting
try:
    from shapely.geometry import Polygon, box  # type: ignore
    from shapely.affinity import rotate as shp_rotate, translate as shp_translate  # type: ignore
    from shapely.ops import unary_union  # type: ignore

    _HAS_SHAPELY = True
except Exception:
    Polygon = None  # type: ignore
    box = None  # type: ignore
    shp_rotate = None  # type: ignore
    shp_translate = None  # type: ignore
    unary_union = None  # type: ignore
    _HAS_SHAPELY = False

try:
    import pyclipper  # type: ignore

    _HAS_PYCLIPPER = True
except Exception:
    pyclipper = None  # type: ignore
    _HAS_PYCLIPPER = False

_IRREGULAR_DEPS_OK = _HAS_SHAPELY

# Re-export for convenience
__all__ = [
    "Polygon",
    "box",
    "shp_rotate",
    "shp_translate",
    "unary_union",
    "pyclipper",
    "_HAS_SHAPELY",
    "_HAS_PYCLIPPER",
    "_IRREGULAR_DEPS_OK",
]
