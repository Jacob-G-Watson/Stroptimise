"""Application bootstrap: create FastAPI app and wire routers.

This file is intentionally small — the original large `app.py` was split into
several modules under `server/api/` for readability and maintainability.
"""

from fastapi import FastAPI
from sqlmodel import SQLModel
from sqlalchemy import text

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
    # Lightweight migration: ensure 'sheet_index' column exists on 'placement'
    try:
        with engine.begin() as conn:
            cols = conn.exec_driver_sql("PRAGMA table_info('placement')").fetchall()
            col_names = {row[1] for row in cols}  # row[1] is the name
            if "sheet_index" not in col_names:
                conn.exec_driver_sql(
                    "ALTER TABLE placement ADD COLUMN sheet_index INTEGER NOT NULL DEFAULT 1"
                )
    except Exception:
        # Best-effort; if migration fails, continue to avoid blocking app startup
        pass
