## Quick orientation for AI coding agents

This file captures the concrete, discoverable knowledge an AI assistant needs to be productive in this repository.

### What this project is

-   Full-stack app: React frontend (in `frontend/`) and FastAPI backend (in `server/`).
-   Backend uses `FastAPI` + `SQLModel` and stores data in an on-disk SQLite DB at `server/db.sqlite3`.
-   Frontend uses Create React App + Tailwind; `frontend/package.json` sets a proxy to `http://localhost:9050` so the dev server forwards API calls to the backend.

### How to run locally (developer workflows)

-   Frontend (PowerShell):
    -   `cd frontend ; npm start` — runs dev server (CRA) which proxies `/api` requests to backend.
-   Backend (PowerShell):
    -   `cd server`
    -   Create venv, activate and install: `py -m venv .venv ; .\.venv\Scripts\Activate.ps1 ; py -m pip install -r requirements.txt`
    -   Run dev server: `py -m uvicorn app:app --reload --host 0.0.0.0 --port 9050`
-   Docker: `docker-compose build --no-cache ; docker-compose up -d` (project has `docker-compose.yml` and `Dockerfile`).

### Key files and entry points (where to change behaviour)

-   `server/app.py` — FastAPI app bootstrap. Important: it loads the root `.env` BEFORE importing routers. If you need to change env-driven behaviour, edit `.env` and `app.py` ordering if necessary.
-   `server/api/*.py` — API routers. Each module mounts under `/api` in `app.py`. Examples:
    -   `server/api/cabinets.py` contains `POST /jobs/{pid}/cabinets` (adds cabinet), `GET /jobs/{pid}/cabinets`, `POST /cabinets/{cid}/pieces` (adds a piece: accepts `polygon` and will derive width/height if missing), and `DELETE /cabinets/{cid}` (deletes pieces then cabinet).
    -   `server/api/*` use the `current_active_user` dependency (auth protected).
-   `server/models.py` — SQLModel models (User, Job, Cabinet, Piece, Sheet, PlacementGroup, etc.). Note `guid()` defaults to string UUIDs.
-   `server/services/` — optimisation, packing and export logic (e.g. `rect_packer.py`, `irregular_packer.py`, `optimiser.py`). This is where placement algorithms live.
-   `frontend/src/services/api.js` — canonical client API helpers, `ApiError`, `handleResponse` and specific functions (e.g. `getJob`, `addCabinetToJob`, `computeJobLayout`). Use these functions in new components or tests to keep behaviour consistent.
-   `frontend/src/services/authFetch.js` — small wrapper that attaches `window.__access_token` as a Bearer token. The frontend stores the in-memory access token on `window.__access_token`.
-   `frontend/src/components/*` — React components. Example: `JobDetails.jsx` uses `AbortController` for requests, maintains `expanded` state keyed by `id`, and calls `addCabinetToJob` + `getJobCabinets`.

### Authentication & session flow (important for API calls)

-   Endpoints:
    -   Login: `POST /api/auth/jwt/login` (form-encoded username/password)
    -   Register: `POST /api/auth/register`
    -   Refresh: `POST /api/auth/refresh` and `POST /api/auth/refresh/bootstrap`
-   Backend rotates refresh tokens and expects refresh cookies / CSRF. The frontend stores the short-lived access token in memory and uses `authFetch` to attach it.
-   Most routers include `Depends(current_active_user)` so API calls require authentication.

### Error handling & patterns to follow

-   Frontend throws an `ApiError` for non-2xx responses (see `frontend/src/services/api.js`). New client code should use `handleResponse` or throw `ApiError` in the same shape to keep error handling consistent.
-   When changing API responses, update `handleResponse` and consumers accordingly.

### Data & behaviour details worth knowing (concrete examples)

-   `POST /cabinets/{cid}/pieces` accepts `polygon` (array of [x,y]). If `width` or `height` are omitted, server derives them from the polygon bounding box — this compatibility behaviour is implemented in `server/api/cabinets.py`.
-   Deleting a cabinet (server-side) removes associated pieces to avoid orphans (`server/api/cabinets.py`).
-   DB schema is created at startup via `SQLModel.metadata.create_all(engine)` in `server/app.py`. There is no migration system; schema changes will require handling existing SQLite files (`server/db.sqlite3`).

### Tests and verification

-   Unit tests are under `tests/` (e.g. `tests/test_irregular_packing.py`). Run tests from the repo root (or `server/`) with pytest after activating the Python environment:
    -   `py -m pytest -q` (ensure the virtualenv is active and `requirements.txt` installed).
-   After making backend changes, run the FastAPI dev server and exercise the frontend or use API tests.

### Where to look for common/fragile areas

-   Optimiser/packer code in `server/services/` — numeric and geometric algorithms: changes here should include unit tests and smoke checks.
-   Auth: token rotation and CSRF handling is sensitive. Edits to auth code must preserve refresh rotation logic.
-   Frontend API helpers (`api.js`, `authFetch.js`) centralise network behaviour — change them rather than duplicating logic across components.

### Pull request / code edit guidance for agents

-   When adding a backend API route: update `server/api/<module>.py`, add/adjust unit tests in `tests/`, and run `py -m pytest`.
-   When changing data models: remember the repo relies on `create_all()` (no migrations). Delete `server/db.sqlite3` in local dev to recreate schema when appropriate; document destructive steps in the PR.
-   When adding frontend APIs, use the existing functions in `frontend/src/services/api.js` and `authFetch` so token behaviour and error shaping remain consistent.

If any section is unclear or you want more examples (for instance, a small end-to-end change example: add an endpoint + update the React component + test), say which area and I will expand with step-by-step edits and tests.
