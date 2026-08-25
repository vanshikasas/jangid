# Security and Deployment Checklist

## Public frontend

- Deploy static assets behind a CDN with a managed WAF, DDoS protection, bot controls, and rate limits.
- Enforce HTTPS and redirect HTTP before traffic reaches the application.
- Apply the supplied security headers at the CDN/hosting layer. Tighten CSP sources after the final Spline and analytics domains are known.
- Never put secrets in browser code, `VITE_*` environment values, public JSON, or client-side route guards.
- Limit third-party scripts. Pin them, review their privacy terms, and add them explicitly to CSP.

## Future backend and portals

- Authenticate server-side; use short-lived secure, `HttpOnly`, `Secure`, `SameSite` cookies or another reviewed token model.
- Hash passwords with Argon2id, require MFA for employer accounts, lock out or challenge suspicious attempts, and rotate/revoke sessions.
- Validate and authorize every request server-side. Frontend role checks are for usability only and never enforce access.
- Use database row/tenant ownership checks for every project, drawing, message, or document query.
- Use schema validation, parameterized queries/ORM protections, output encoding, CSRF protection where cookies are used, upload scanning, signed short-lived upload/download URLs, and malware-aware object storage.
- Record immutable audit events for logins, permission changes, file access, exports, and sensitive record changes. Do not log passwords, tokens, or full sensitive form content.
- Keep secrets in a managed secret store; encrypt data at rest/backups, set retention periods, test restores, monitor anomalous access, patch dependencies, and schedule external security testing before launch.

## Honest browser-data rule

The Network tab should show only the data a signed-in person is allowed to submit or receive. It cannot be hidden from that person, but TLS prevents transit interception and server authorization prevents access to anyone else's data.
