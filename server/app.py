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
from api.auth import router as auth_router

app = FastAPI()

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
    # Lightweight migration: ensure 'sheet_index' column exists on 'placement'
    try:
        with engine.begin() as conn:
            cols = conn.exec_driver_sql("PRAGMA table_info('placement')").fetchall()
            col_names = {row[1] for row in cols}  # row[1] is the name
            if "sheet_index" not in col_names:
                conn.exec_driver_sql(
                    "ALTER TABLE placement ADD COLUMN sheet_index INTEGER NOT NULL DEFAULT 1"
                )
        # Add password_hash to user table if missing (idempotent)
        with engine.begin() as conn:
            user_cols = conn.exec_driver_sql("PRAGMA table_info('user')").fetchall()
            u_col_names = {row[1] for row in user_cols}
            if "password_hash" not in u_col_names:
                conn.exec_driver_sql(
                    "ALTER TABLE user ADD COLUMN password_hash VARCHAR(512)"
                )
            # Drop legacy plaintext password column if it still exists
            if "password" in u_col_names:
                # SQLite cannot DROP COLUMN before version 3.35; perform a table rebuild
                conn.exec_driver_sql("BEGIN TRANSACTION")
                # Reinspect in case prior ops changed schema
                user_cols2 = conn.exec_driver_sql(
                    "PRAGMA table_info('user')"
                ).fetchall()
                u2 = {row[1] for row in user_cols2}
                if "password" in u2:
                    # Build new table without password
                    conn.exec_driver_sql(
                        "CREATE TABLE IF NOT EXISTS user_new (id VARCHAR PRIMARY KEY, name VARCHAR NOT NULL, password_hash VARCHAR(512), kerf_mm INTEGER, allow_rotation BOOLEAN)"  # kerf/allow_rotation placeholders if ever added per-user
                    )
                    # Copy data
                    conn.exec_driver_sql(
                        "INSERT INTO user_new (id, name, password_hash) SELECT id, name, password_hash FROM user"
                    )
                    conn.exec_driver_sql("DROP TABLE user")
                    conn.exec_driver_sql("ALTER TABLE user_new RENAME TO user")
                conn.exec_driver_sql("COMMIT")
    except Exception:
        # Best-effort; if migration fails, continue to avoid blocking app startup
        pass
