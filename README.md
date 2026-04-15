# Media Sync Workspace

This workspace is organized into two sibling applications:

- `backend/` - NestJS MediaMTX media-sync backend
- `frontend/` - Vite + React Stream Harmony Control dashboard

## Backend

The backend provides:

- REST API under `/api`
- Swagger UI under `/api/docs`
- Socket.IO realtime events under `/socket.io`
- MongoDB-backed streams, pods, alerts, metrics, and inspection data

See:

- `backend/README.md`
- `backend/API_DOCUMENTATION.md`
- `backend/SYSTEM_DOCUMENTATION.md`

## Frontend

The frontend consumes the backend as-is and is intentionally adapted to the existing backend contract.

For local development:

1. Start the backend from `backend/`
2. Start the frontend from `frontend/`

The frontend Vite dev server proxies `/api` and `/socket.io` to the backend.

## Separate Deployment

The frontend can be deployed as a separate container from `frontend/Dockerfile`.

It proxies API and Socket.IO traffic to the backend using the `BACKEND_UPSTREAM` environment variable.
