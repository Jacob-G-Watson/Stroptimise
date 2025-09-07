# READ ME

## Local Docker

docker-compose build --no-cache ; docker-compose up -d

## Self hosting

- npm build
- copy ./frontend/build /appdata/compose/stroptimise/frontend_build
- copy ./frontend/default/conf /appdata/compose/stroptimise/nginx/default.conf
- copy ./server /appdata/compose/stroptimise/server
- copy ./env /appdata/compose/stroptimise/env
- copy ./dockerCompose /appdata/compose/stroptimise/dockerCompose
- copy ./Dockerfile /appdata/compose/stroptimise/Dockerfile

compose up

## Local Dev

### Frontend

npm start

### Server

On Windows, install deps and run server:

```powershell
cd .\server\
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
py -m uvicorn app:app --reload --host 0.0.0.0 --port 9050
```

## Auth flow

```mermaid

sequenceDiagram
    autonumber
    participant U as User
    participant FE as Frontend (React)
    participant API as FastAPI Backend
    participant DB as SQLite (User table)

    Note over FE: Initial Page Load (Unauthenticated)
    FE->>API: POST /api/auth/refresh (with X-CSRF-Token, cookies)
    alt Refresh valid
        API->>API: Verify refresh JWT & CSRF
        API-->>FE: 200 {access_token} (new access token)
        FE->>API: GET /api/users/me (Authorization: Bearer)
        API->>DB: SELECT user by id
        DB-->>API: User
        API-->>FE: {id, name}
        FE->>FE: Set user, skip login screen
    else No/invalid refresh
        API-->>FE: 401
        FE->>FE: Stay on login form
    end

    Note over U,FE: User submits credentials (login)
    U->>FE: Enter username + password
    FE->>API: POST /api/users/login {name, password}
    API->>API: Rate limit check (IP+username)
    API->>DB: SELECT user WHERE name
    DB-->>API: User / None
    API->>API: Argon2 verify password_hash (rehash if params changed)
    alt Valid credentials
        API->>API: Create access & refresh JWT (iss,aud) + CSRF token
        API-->>FE: 200 {access_token, user:{id,name}, expires_in} + Set-Cookie(refresh, csrf)
        FE->>FE: Store access token (memory) & schedule proactive refresh
        FE->>API: Authenticated requests (Authorization: Bearer <access>)
    else Invalid credentials
        API-->>FE: 401 {error}
        FE->>FE: Show error message
    end

    Note over U,FE: Signup
    U->>FE: Enter new username + password
    FE->>API: POST /api/users {name,password}
    API->>API: Create user + tokens (no second login request)
    API-->>FE: 201 {access_token, user, expires_in} + Set-Cookie(refresh, csrf)
    FE->>FE: Store token & schedule proactive refresh

    Note over FE,API: Access token expires (~15m)
    FE->>API: POST /api/auth/refresh (cookies + X-CSRF-Token header)
    API->>API: Verify refresh token & CSRF rotate & revoke old
    alt Reuse detected (revoked token presented)
        API->>API: Revoke all user sessions log security event
        API-->>FE: 401 {error: reuse detected}
        FE->>FE: Force logout sequence
    else Normal rotation
        API-->>FE: 200 {access_token, expires_in} + Set-Cookie(new refresh, csrf)
        FE->>FE: Update token & reschedule proactive refresh
    end

    Note over U,FE: Logout
    U->>FE: Click Logout
    FE->>API: POST /api/auth/logout
    API-->>FE: 200 {status: logged_out} (cookies cleared)
    FE->>FE: Drop in-memory access token & user return to login
```
