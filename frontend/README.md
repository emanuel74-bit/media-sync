# Stream Harmony Control

This Vite + React application is the control plane, dashboard, and metrics UI for the MediaMTX `media-sync` backend.

## Project Role

- Displays streams, pods, alerts, metrics, and inspection data from the backend
- Uses the backend REST API under `/api`
- Uses the backend Socket.IO server under `/socket.io` for realtime refresh
- Does not require backend changes for frontend deployment

## Local Development

Run the backend on `http://localhost:3000`, then start this app:

```bash
npm install
npm run dev
```

The Vite dev server proxies:

- `/api` -> `http://localhost:3000`
- `/socket.io` -> `http://localhost:3000`

If your backend is not running on `localhost:3000`, set:

```bash
VITE_DEV_BACKEND_URL=http://your-backend-host:3000
```

## Production Build

```bash
npm install
npm run build
```

## Docker Deployment

Build the frontend image:

```bash
docker build -t stream-harmony-control .
```

Run it and point it at the backend instance:

```bash
docker run -p 8080:80 -e BACKEND_UPSTREAM=http://backend-host:3000 stream-harmony-control
```

The container serves the compiled frontend with Nginx and proxies:

- `/api/*` -> backend REST API
- `/socket.io/*` -> backend Socket.IO server

This keeps browser traffic same-origin from the frontend container and avoids requiring new backend HTTP CORS behavior.
