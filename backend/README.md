# SKJA Rust API

Rust backend for SK Jangid & Associates. It owns public content, form submissions, authentication, RBAC, audit events, and the future data boundary for the website, portal, and Android app.

## Runtime

| Item | Value |
| --- | --- |
| Language | Rust |
| Framework | Axum |
| Local API port | `5000` |
| Health route | `GET /health` |
| API prefix | `/api/v1` |

## Manual Commands

Run from the repository root.

```bash
cargo check --manifest-path backend/Cargo.toml
cargo run --manifest-path backend/Cargo.toml
```

For a deployment-style local run, use `npm run up` from the repository root to start frontend and backend via Docker Compose.

## Environment

Create `backend/.env` from `backend/.env.example` when you are ready to configure real values.

Important values:

| Variable | Purpose |
| --- | --- |
| `API_PORT` | API port. Use `5000` locally. |
| `APP_ORIGINS` | Allowed frontend origins, for example `http://localhost:3000`. |
| `PUBLIC_API_BASE_URL` | Public backend base URL used in generated media links. |
| `DATABASE_URL` | Required by the production configuration; persistence implementation is still pending. |
| `INITIAL_ADMIN_EMAIL` | First admin login email for local seed data. |
| `INITIAL_ADMIN_PASSWORD` | First admin password for local seed data. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Enables Google OAuth login for client users. |
| `GOOGLE_REDIRECT_URI` | OAuth callback route, typically `http://localhost:5000/api/v1/auth/google/callback`. |
| `GOOGLE_PORTAL_REDIRECT_URL` | Frontend URL to return to after Google callback, typically `http://localhost:3000/portal`. |

Do not commit real `.env` values.

## Current API Surface

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | API status |
| `GET` | `/api/v1/public/projects` | Public website project data |
| `GET` | `/api/v1/public/services` | Public website service data |
| `POST` | `/api/v1/inquiries/client` | Client contact form |
| `POST` | `/api/v1/inquiries/employment` | Employment form |
| `POST` | `/api/v1/auth/login` | Portal login |
| `GET` | `/api/v1/auth/google` | Google OAuth start URL |
| `GET` | `/api/v1/auth/google/callback` | Google OAuth callback |
| `GET` | `/api/v1/auth/me` | Current authenticated user |
| `POST` | `/api/v1/auth/logout` | Logout |
| `GET` | `/api/v1/public/media/{scope}` | Public page media (`projects` or `services`) |
| `GET` | `/api/v1/public/files/{id}` | Public media file stream |

Admin, employee, project, task, inquiry, file, and chat routes are grouped under `/api/v1/admin` or the matching portal module in `backend/src/api.rs`.

## Security Baseline

The backend includes request size limits, request timeout, a single allowed frontend origin by default, security headers, Argon2 password hashes, session-style authentication, CSRF validation for state changes, rate limits, and role checks.

Production still needs persistent database storage, stricter secrets, deployment-level rate limiting, HTTPS-only cookies, storage scanning for uploads, external object storage, and full tests before real client data is used.

## Next Backend Work

1. Replace in-memory state with the selected database.
2. Add migrations/schema for users, roles, projects, inquiries, tasks, files, and audit events.
3. Add tests for auth, RBAC, inquiry submission, and project updates.
4. Add signed upload URLs or server-validated upload storage.
5. Connect Android app endpoints to the same authenticated API contract.
