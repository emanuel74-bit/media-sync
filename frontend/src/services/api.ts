import {
    Alert,
    Metric,
    Pod,
    Stream,
    StreamAssignment,
    StreamInspection,
} from "@/types";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

function buildUrl(path: string): string {
    return API_BASE ? `${API_BASE}${path}` : path;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(buildUrl(path), {
        headers: { "Content-Type": "application/json" },
        ...options,
    });
    if (res.status === 204) return undefined as T;
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || res.statusText);
    }
    return res.json();
}

// Streams
export const streamsApi = {
    getAll: () => request<Stream[]>("/api/streams"),
    getByName: (name: string) => request<Stream>(`/api/streams/${name}`),
    create: (data: { name: string; source: string; enabled?: boolean }) =>
        request<Stream>("/api/streams", {
            method: "POST",
            body: JSON.stringify(data),
        }),
    update: (
        name: string,
        data: { source?: string; enabled?: boolean; status?: string },
    ) =>
        request<Stream>(`/api/streams/${name}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        }),
    delete: (name: string) =>
        request<void>(`/api/streams/${name}`, { method: "DELETE" }),
    assign: (name: string, podId: string) =>
        request<Stream>(`/api/streams/${name}/assign`, {
            method: "PATCH",
            body: JSON.stringify({ podId }),
        }),
    unassign: (name: string) =>
        request<Stream>(`/api/streams/${name}/unassign`, { method: "PATCH" }),
    getAssignments: () =>
        request<StreamAssignment[]>("/api/streams/assignment"),
};

// Pods
export const podsApi = {
    getAll: () => request<Pod[]>("/api/pods"),
    getActive: () => request<Pod[]>("/api/pods/active"),
    register: (data: {
        podId: string;
        host?: string;
        tags?: string[];
        type?: "ingest" | "cluster";
    }) =>
        request<Pod>("/api/pods/register", {
            method: "POST",
            body: JSON.stringify(data),
        }),
    heartbeat: (data: {
        podId: string;
        host?: string;
        tags?: string[];
        type?: "ingest" | "cluster";
    }) =>
        request<Pod>("/api/pods/heartbeat", {
            method: "POST",
            body: JSON.stringify(data),
        }),
};

// Alerts
export const alertsApi = {
    getAll: () => request<Alert[]>("/api/alerts"),
    resolve: (id: string) =>
        request<Alert>(`/api/alerts/${id}/resolve`, { method: "PATCH" }),
};

// Metrics
export const metricsApi = {
    getByStream: (name: string, limit?: number) =>
        request<Metric[]>(
            `/api/metrics/stream/${name}${limit ? `?limit=${limit}` : ""}`,
        ),
};

// Stream Inspection
export const inspectionApi = {
    getAll: () => request<StreamInspection[]>("/api/stream-inspection"),
    getByStream: (streamName: string) =>
        request<StreamInspection>(`/api/stream-inspection/${streamName}`),
    getHistory: (streamName: string, limit?: number) =>
        request<StreamInspection[]>(
            `/api/stream-inspection/${streamName}/history${limit ? `?limit=${limit}` : ""}`,
        ),
};
