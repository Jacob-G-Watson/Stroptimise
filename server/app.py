"""Application bootstrap: create FastAPI app and wire routers.

This file is intentionally small — the original large `app.py` was split into
several modules under `server/api/` for readability and maintainability.
"""

from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from sqlmodel import SQLModel
from sqlalchemy import text

from db import engine

# Load .env BEFORE importing routers that read env vars (e.g. JWT secret)
root_env = Path(__file__).resolve().parents[1] / ".env"
if root_env.exists():
    load_dotenv(root_env)

# Configure centralized logging before importing modules that may log during
# import. This ensures consistent formatting and handlers across the backend.
from logging_config import configure_logging  # noqa: E402

configure_logging()

# Now safe to import routers that depend on env configuration
from api import cabinets, jobs, pieces, layout  # noqa: E402
from api import auth_fastapi_users  # noqa: E402

app = FastAPI()

# Register API routers; each router defines routes like "/jobs" or
# "/cabinets" and we mount them under the common "/api" prefix.
app.include_router(cabinets.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(pieces.router, prefix="/api")
app.include_router(layout.router, prefix="/api")
app.include_router(auth_fastapi_users.combined_auth_router, prefix="/api")


@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)
