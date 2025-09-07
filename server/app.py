"""Application bootstrap: create FastAPI app and wire routers.

This file is intentionally small — the original large `app.py` was split into
several modules under `server/api/` for readability and maintainability.
"""

from pathlib import Path

from dotenv import load_dotenv

from fastapi import FastAPI
from sqlmodel import SQLModel
from sqlalchemy import text

# Import engine and routers from sibling modules
from db import engine
from api import cabinets, jobs, pieces, users, layout
from api.auth import router as auth_router

app = FastAPI()

# Load .env from repository root (one level above server/). This allows a project-root
# .env file to provide JWT_SECRET and other env vars used by the server.
root_env = Path(__file__).resolve().parents[1] / ".env"
if root_env.exists():
    load_dotenv(root_env)

# Register API routers; each router defines routes like "/jobs" or
# "/cabinets" and we mount them under the common "/api" prefix.
app.include_router(cabinets.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(pieces.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(layout.router, prefix="/api")
app.include_router(auth_router, prefix="/api")


@app.on_event("startup")
def on_startup():
    """Create DB tables at startup (preserves previous behavior)."""
    SQLModel.metadata.create_all(engine)
