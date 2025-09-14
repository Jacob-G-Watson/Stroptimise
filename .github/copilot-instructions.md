## Copilot instructions (project-specific, concise)

This repo is a full-stack app: a Create-React-App frontend in `frontend/` and a FastAPI + SQLModel backend in `server/` backed by an on-disk SQLite DB at `server/db.sqlite3`.

Be productive quickly:

-   Run frontend dev: from repo root `cd frontend; npm start` (CRA dev server proxies `/api` to backend — see `frontend/package.json` proxy).
-   Run backend dev: `cd server; py -m venv .venv ; .\.venv\Scripts\Activate.ps1 ; py -m pip install -r requirements.txt ; py -m uvicorn app:app --reload --host 0.0.0.0 --port 9050`.
-   Docker compose: `docker-compose build --no-cache ; docker-compose up -d` is available for full-stack runs.

Key places to look when editing behavior:

-   `server/app.py` — FastAPI bootstrap. It loads `.env` before mounting routers and runs `SQLModel.metadata.create_all(engine)` on startup (no migrations).
-   `server/models.py` — SQLModel models (User, Job, Cabinet, Piece, Sheet, PlacementGroup). GUIDs default to UUID strings.
-   `server/api/*.py` — API routers mounted under `/api`. Most routes use `Depends(current_active_user)` and require auth. Example: `server/api/cabinets.py` implements `POST /jobs/{pid}/cabinets`, `POST /cabinets/{cid}/pieces` (accepts `polygon`; server derives width/height if missing), and `DELETE /cabinets/{cid}` (removes pieces then the cabinet).
-   `server/services/` — optimisation/packing code (e.g., `rect_packer.py`, `irregular_packer.py`, `optimiser.py`). Treat numeric/geometric changes cautiously and add tests.
-   `frontend/src/services/api.ts` and `authFetch.ts` — central API helper and auth wrapper. `authFetch` reads `window.__access_token` and attaches it as a Bearer token; the frontend stores the short-lived access token in-memory on `window.__access_token`.

Auth and session notes:

-   Login: `POST /api/auth/jwt/login` (form-encoded). Refresh endpoints exist at `/api/auth/refresh` and `/api/auth/refresh/bootstrap`.
-   The backend rotates refresh tokens and expects cookie/CSRF behavior. Don’t bypass `current_active_user` dependency unless intentionally creating a public endpoint.

Tests and verification:

-   Python tests live in `tests/` (e.g., `tests/test_irregular_packing.py`). Run from repo root or `server/` with `py -m pytest -q` after activating the venv.
-   After server changes, run the backend dev server and exercise via the frontend or tests. For packing changes, add unit tests that assert placements and basic invariants.

Project-specific conventions / gotchas:

-   DB is created with `create_all()`; there is no migration system. For model changes, document destructive steps (delete `server/db.sqlite3` in dev) and include tests.
-   API response shaping and errors are centralized in `frontend/src/services/api.ts` (ApiError, handleResponse). Update both client and server when changing response formats.
-   Do not assume persistent access tokens; frontend stores tokens in-memory (not localStorage). Use `authFetch` for authenticated requests.

When adding functionality:

-   Backend route: add to `server/api/<module>.py`, update/import models in `server/models.py`, and add tests in `tests/`.
-   Frontend: call existing functions in `frontend/src/services/api.ts` to preserve uniform error handling and token behavior. Reuse `authFetch.ts`.

Files to inspect first for most changes: `server/app.py`, `server/models.py`, `server/api/*.py`, `server/services/*`, `frontend/src/services/api.ts`, and `frontend/src/services/authFetch.ts`.

If something isn't discoverable here (CI settings, external integrations), ask a human for secrets/credentials or missing docs. After edits, run lint/tests and a quick smoke run (see above commands).
