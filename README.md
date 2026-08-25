# SK Jangid & Associates

Premium architecture website with an Angular TypeScript frontend and Rust API. The client and employer portal is a protected route within the same Angular application.

## Current Stack

| Layer | Technology | Status |
| --- | --- | --- |
| Public website | Angular 22 + TypeScript | Active |
| Portal UI | Angular TypeScript route at `/portal` | Active |
| Backend API | Rust + Axum | Active |
| Database | Example/local configuration only | Pending final provider URL |

## Project Structure

```text
SKJA/
|-- frontend/
|   |-- src/                 # Angular TypeScript website and portal
|   |-- public/              # Static assets and runtime config
|   |-- angular.json         # Angular workspace config
|   `-- package.json         # Frontend scripts and Angular dependencies
|-- backend/
|   |-- src/                 # Rust API source
|   |-- docs/                # Backend security notes
|   |-- Dockerfile           # Backend container build
|   |-- Cargo.toml           # Rust package and dependency config
|   `-- .env.example         # Backend environment template
|-- app/
|   `-- MOBILE_API_CONTRACT.md
|-- docker-compose.yml       # Frontend + backend orchestration
`-- package.json             # Root development commands
```

## Local URLs

| Service | URL |
| --- | --- |
| Marketing website | `http://localhost:3000` |
| Employer/client portal | `http://localhost:3000/portal` |
| Rust API | `http://localhost:5000/api/v1` |
| API health check | `http://localhost:5000/health` |

## Local Development (without Docker)

Run these in separate terminals from the project root.

```bash
npm run dev:backend
npm run dev:frontend
```

For targeted checks:

```bash
npm run build --prefix frontend
cargo check --manifest-path backend/Cargo.toml
```

## Docker Compose (recommended run flow)

```bash
npm run up
```

This builds and runs both services with health checks:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

To stop containers:

```bash
npm run down
```

To stream container logs:

```bash
npm run logs
```

## Environment Files

Create these from the examples when you are ready to connect real services.

| File | Purpose |
| --- | --- |
| `backend/.env` | Backend port, allowed origins, database placeholder, and admin seed user |
| `frontend/public/runtime-config.js` | Public browser API base URL only |
| `frontend/.env` | Frontend-only local values if Angular tooling needs them later |

Never put passwords, database URLs, JWT secrets, cookie secrets, admin passwords, or private access tokens in Angular code or public runtime config.

## Application Flow

```text
Visitor
  |
  v
Angular website on localhost:3000
  |
  |-- Reads public projects/services from Rust API
  |-- Sends client and employment contact forms to Rust API
  |
  v
Rust Axum API on localhost:5000
  |
  |-- Validates requests
  |-- Applies CORS, request size limits, timeouts, and security headers
  |-- Owns authentication, RBAC, inquiries, projects, tasks, and audit data
  |
  v
Database provider, to be connected later
```

## Security Direction

The browser cannot hide sensitive data from inspect tools. Anything private must stay behind the Rust backend and be returned only after authentication and RBAC checks.

The current backend applies CSRF checks for cookie-authenticated writes, request limits, validation, audit events, and role checks. Production hardening still needs database persistence, HTTPS deployment, deployment-level DDoS controls, protected file storage, and automated tests.

## Next Build Steps

1. Replace in-memory backend state with the selected database.
2. Expand the role-specific portal workflows for Admin, Employer, and Client.
3. Add backend tests for authentication, RBAC, inquiry submission, and project management.
4. Build the Android app against the same authenticated Rust API contract.
