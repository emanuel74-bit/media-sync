# Stream Harmony Control

This Vite + React application is the control plane, dashboard, and metrics UI for the MediaMTX `media-sync` backend.

## Project Role

- Displays streams, pods, alerts, metrics, and inspection data from the backend
- Uses the backend REST API under `/api`
- Uses the backend Socket.IO server under `/socket.io` for realtime refresh
- Does not require backend changes for frontend deployment

## Tech Stack

- **Build**: Vite 5 + React 18 + TypeScript (SWC)
- **UI**: shadcn/ui components (Radix primitives) + Tailwind CSS, `lucide-react` icons
- **Data**: TanStack Query (polling + WebSocket-driven invalidation), React Router 6
- **Charts**: Recharts
- **Realtime**: Socket.IO client, loaded at runtime from the backend (`/socket.io/socket.io.min.js`)
- **Tests**: Vitest (+ Testing Library), Playwright config available

## Pages

| Route | Page | Purpose |
| --- | --- | --- |
| `/` | Dashboard | KPI overview |
| `/streams` | Streams | Stream list with create/edit/delete/enable dialogs |
| `/streams/:name` | Stream Detail | Per-stream metrics, inspection panel, assignment |
| `/pods` | Pods | Registered pods and heartbeat status |
| `/metrics` | Metrics | Stream performance charts |
| `/alerts` | Alerts | Alert list with resolve action |
| `/cluster` | Cluster | Cluster pod / assignment view |

## Code Layout

- `src/services/api.ts` — typed fetch wrappers for all backend REST endpoints (streams, pods, alerts, metrics, stream-inspection)
- `src/services/websocket.ts` — Socket.IO connection manager; subscribes to `stream.synced`, `stream.removed`, `alert.created`, `stream.inspected`
- `src/hooks/use-streams.ts` — TanStack Query hooks (10s polling for streams/pods/alerts, 30s for inspections) plus `useRealtimeSync()`, which invalidates query caches on WebSocket events
- `src/types/index.ts` — API response types
- `src/pages/` — route components, `src/components/` — app components, `src/components/ui/` — shadcn/ui primitives

## Local Development

Run the backend on `http://localhost:3000`, then start this app:

```bash
npm install
npm run dev
```

The Vite dev server runs on port 8080 and proxies:

- `/api` -> `http://127.0.0.1:3000`
- `/socket.io` -> `http://127.0.0.1:3000` (WebSocket-aware)

If your backend is not running on `localhost:3000`, set:

```bash
VITE_DEV_BACKEND_URL=http://your-backend-host:3000
```

### Environment Variables

| Variable | Used in | Purpose |
| --- | --- | --- |
| `VITE_DEV_BACKEND_URL` | dev server | Proxy target for `/api` and `/socket.io` |
| `VITE_API_URL` | build/runtime | Absolute backend base URL; when unset, requests stay same-origin (recommended behind the nginx proxy) |

## Testing

```bash
npm test          # Vitest, single run
npm run test:watch
npm run lint
```

Unit tests live in `src/test/` (jsdom environment, setup in `src/test/setup.ts`). A Playwright config (`playwright.config.ts`) is present for browser-driven testing.

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
- `/socket.io/*` -> backend Socket.IO server (WebSocket upgrade headers set)

`BACKEND_UPSTREAM` defaults to `http://media-sync-backend:3000` and is substituted into the nginx config at container start.

This keeps browser traffic same-origin from the frontend container and avoids requiring new backend HTTP CORS behavior.
