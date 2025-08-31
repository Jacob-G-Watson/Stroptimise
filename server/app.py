"""Application bootstrap: create FastAPI app and wire routers.

This file is intentionally small — the original large `app.py` was split into
several modules under `server/api/` for readability and maintainability.
"""

from fastapi import FastAPI
from sqlmodel import SQLModel

# Import engine and routers from sibling modules
from db import engine
from api import cabinets, jobs, pieces, users, layout

app = FastAPI()

# Register API routers; each router defines routes like "/jobs" or
# "/cabinets" and we mount them under the common "/api" prefix.
app.include_router(cabinets.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(pieces.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(layout.router, prefix="/api")


@app.on_event("startup")
def on_startup():
    """Create DB tables at startup (preserves previous behavior)."""
    SQLModel.metadata.create_all(engine)
