# Android App Foundation

The Android app will use the same HTTPS API as the website and web portal. It will not access PostgreSQL, storage, or internal services directly.

## Planned stack

- Expo / React Native for Android.
- Secure device storage for short-lived mobile session credentials.
- `GET /api/v1/public/*` for public company content.
- Authenticated, role-scoped `/api/v1/*` endpoints for client and employer features.

## Rules

- Do not place database credentials, API secrets, or employee/client records in the Android app.
- Request only the data permitted for the authenticated role and project relationship.
- Use signed URLs issued by the API for future document uploads/downloads.

The mobile UI starts after the browser portal workflows and file-storage provider are approved.
