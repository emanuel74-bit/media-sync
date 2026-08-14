import { http, HttpResponse } from "msw";

import type { Alert, Node, Stream, StreamReservation } from "@/types";

import { db, nodeMetricSeries, pathMetricSeries, timestamps } from "./fixtures";

const { now } = timestamps;
const decode = (v: string) => decodeURIComponent(v);
const findStream = (name: string) =>
    db.streams.find((s) => s.name === decode(name));
const limitOf = (url: string, fallback: number): number => {
    const raw = new URL(url).searchParams.get("limit");
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : fallback;
};
const inspectionsFor = (name: string) =>
    db.inspectionsByStream[decode(name)] ?? [];

// Order matters: register literal paths before ":param" routes so
// /api/streams/assignment is not swallowed by /api/streams/:name.
export const handlers = [
    // --- streams ---
    http.get("/api/streams/assignment", () =>
        HttpResponse.json(
            db.streams.map((s) => ({
                name: s.name,
                assignedNode: s.assignedNode ?? null,
                assignedAt: s.assignedAt ?? null,
                status: s.status,
            })),
        ),
    ),

    http.get("/api/streams", () => HttpResponse.json(db.streams)),

    http.get("/api/streams/:name", ({ params }) => {
        const stream = findStream(params.name as string);
        return stream
            ? HttpResponse.json(stream)
            : HttpResponse.json(null, { status: 404 });
    }),

    http.post("/api/streams", async ({ request }) => {
        const body = (await request.json()) as {
            name: string;
            source: string;
            isEnabled?: boolean;
        };
        const stream: Stream = {
            name: body.name,
            source: body.source,
            status: "created",
            metadata: {},
            isEnabled: body.isEnabled ?? true,
            lastSeenAt: null,
            lastSyncedAt: null,
            lastError: null,
            activeConsumers: 0,
            isManual: true,
            assignedNode: null,
            assignedAt: null,
            createdAt: now(),
            updatedAt: now(),
        };
        db.streams.push(stream);
        return HttpResponse.json(stream, { status: 201 });
    }),

    http.patch("/api/streams/:name/assign", async ({ params, request }) => {
        const stream = findStream(params.name as string);
        if (!stream) return HttpResponse.json(null, { status: 404 });
        const { nodeId } = (await request.json()) as { nodeId: string };
        stream.assignedNode = nodeId;
        stream.assignedAt = now();
        stream.status = "assigned";
        stream.updatedAt = now();
        return HttpResponse.json(stream);
    }),

    http.patch("/api/streams/:name/unassign", ({ params }) => {
        const stream = findStream(params.name as string);
        if (!stream) return HttpResponse.json(null, { status: 404 });
        stream.assignedNode = null;
        stream.assignedAt = null;
        stream.status = "pending_assignment";
        stream.updatedAt = now();
        return HttpResponse.json(stream);
    }),

    http.patch("/api/streams/:name", async ({ params, request }) => {
        const stream = findStream(params.name as string);
        if (!stream) return HttpResponse.json(null, { status: 404 });
        const patch = (await request.json()) as Partial<Stream>;
        Object.assign(stream, patch, { updatedAt: now() });
        return HttpResponse.json(stream);
    }),

    http.delete("/api/streams/:name", ({ params }) => {
        const idx = db.streams.findIndex(
            (s) => s.name === decode(params.name as string),
        );
        if (idx >= 0) db.streams.splice(idx, 1);
        return new HttpResponse(null, { status: 204 });
    }),

    // --- ingest ---
    http.post("/api/ingest/streams", async ({ request }) => {
        const { name } = (await request.json()) as { name: string };
        const publishToken = `mock-token-${Math.random().toString(36).slice(2, 10)}`;
        const reservation: StreamReservation = {
            name,
            ingestNode: "ingest-node-1",
            publishUrl: `rtsp://publish:${encodeURIComponent(publishToken)}@10.0.0.11:8554/${name}`,
            publishToken,
            expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
        };
        return HttpResponse.json(reservation, { status: 201 });
    }),

    // --- nodes ---
    http.get("/api/nodes/active", () =>
        HttpResponse.json(db.nodes.filter((n) => n.status === "active")),
    ),

    http.get("/api/nodes", () => HttpResponse.json(db.nodes)),

    http.post("/api/nodes/register", async ({ request }) => {
        const body = (await request.json()) as Partial<Node> & {
            nodeId: string;
            host: string;
            type: Node["type"];
        };
        let node = db.nodes.find((n) => n.nodeId === body.nodeId);
        if (!node) {
            node = {
                nodeId: body.nodeId,
                host: body.host,
                apiPort: body.apiPort ?? 9000,
                rtspPort: body.rtspPort ?? 8554,
                metricsPort: body.metricsPort ?? 9998,
                type: body.type,
                status: "active",
                lastHeartbeatAt: now(),
                createdAt: now(),
                updatedAt: now(),
            };
            db.nodes.push(node);
        }
        return HttpResponse.json(node, { status: 201 });
    }),

    http.post("/api/nodes/heartbeat", async ({ request }) => {
        const { nodeId } = (await request.json()) as { nodeId: string };
        const node = db.nodes.find((n) => n.nodeId === nodeId);
        if (!node) return HttpResponse.json(null, { status: 404 });
        node.lastHeartbeatAt = now();
        node.status = "active";
        return HttpResponse.json(node);
    }),

    // --- alerts ---
    http.get("/api/alerts", () => HttpResponse.json(db.alerts)),

    http.patch("/api/alerts/:id/resolve", ({ params }) => {
        const alert: Alert | undefined = db.alerts.find(
            (a) => a.id === decode(params.id as string),
        );
        if (!alert) return HttpResponse.json(null, { status: 404 });
        alert.isResolved = true;
        alert.resolvedAt = now();
        alert.updatedAt = now();
        return HttpResponse.json(alert);
    }),

    // --- metrics (time-series, limit-aware) ---
    http.get("/api/metrics/stream/:name", ({ params, request }) =>
        HttpResponse.json(
            pathMetricSeries(
                decode(params.name as string),
                limitOf(request.url, 60),
            ),
        ),
    ),

    http.get("/api/metrics/nodes", ({ request }) =>
        HttpResponse.json(nodeMetricSeries(limitOf(request.url, 60))),
    ),

    // --- stream-inspection ---
    http.get("/api/stream-inspection/:name/history", ({ params, request }) =>
        HttpResponse.json(
            inspectionsFor(params.name as string).slice(
                0,
                limitOf(request.url, 10),
            ),
        ),
    ),

    http.get("/api/stream-inspection/:name", ({ params }) => {
        const [latest] = inspectionsFor(params.name as string);
        return latest
            ? HttpResponse.json(latest)
            : HttpResponse.json(null, { status: 404 });
    }),

    // getAll: latest inspection per stream.
    http.get("/api/stream-inspection", () =>
        HttpResponse.json(
            Object.values(db.inspectionsByStream)
                .map((list) => list[0])
                .filter(Boolean),
        ),
    ),
];
