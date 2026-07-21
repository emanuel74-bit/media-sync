import type {
  Alert,
  Node,
  NodeMetric,
  NodeRole,
  PathMetric,
  Stream,
  StreamAssignment,
  StreamInspection,
  StreamReservation,
  StreamStatus,
} from "@/types";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

function buildUrl(path: string): string {
  return API_BASE ? `${API_BASE}${path}` : path;
}

function pathSegment(value: string): string {
  return encodeURIComponent(value);
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(errorMessage(body, response.statusText));
  }

  return (body ? JSON.parse(body) : undefined) as T;
}

function errorMessage(body: string, fallback: string): string {
  if (!body) return fallback;
  try {
    const parsed = JSON.parse(body) as { message?: string | string[] };
    return Array.isArray(parsed.message)
      ? parsed.message.join(", ")
      : parsed.message || fallback;
  } catch {
    return body;
  }
}

export const streamsApi = {
  getAll: (): Promise<Stream[]> => request("/api/streams"),
  getByName: (name: string): Promise<Stream | null> =>
    request(`/api/streams/${pathSegment(name)}`),
  create: (data: {
    name: string;
    source: string;
    isEnabled?: boolean;
  }): Promise<Stream> =>
    request("/api/streams", { method: "POST", body: JSON.stringify(data) }),
  update: (
    name: string,
    data: { source?: string; isEnabled?: boolean; status?: StreamStatus },
  ): Promise<Stream> =>
    request(`/api/streams/${pathSegment(name)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (name: string): Promise<void> =>
    request(`/api/streams/${pathSegment(name)}`, { method: "DELETE" }),
  assign: (name: string, nodeId: string): Promise<Stream> =>
    request(`/api/streams/${pathSegment(name)}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ nodeId }),
    }),
  unassign: (name: string): Promise<Stream> =>
    request(`/api/streams/${pathSegment(name)}/unassign`, { method: "PATCH" }),
  getAssignments: (): Promise<StreamAssignment[]> =>
    request("/api/streams/assignment"),
};

export const ingestApi = {
  reserve: (name: string): Promise<StreamReservation> =>
    request("/api/ingest/streams", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
};

export const nodesApi = {
  getAll: (): Promise<Node[]> => request("/api/nodes"),
  getActive: (): Promise<Node[]> => request("/api/nodes/active"),
  register: (data: {
    nodeId: string;
    host: string;
    type: NodeRole;
    apiPort?: number;
    rtspPort?: number;
    metricsPort?: number;
  }): Promise<Node> =>
    request("/api/nodes/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  heartbeat: (nodeId: string): Promise<Node> =>
    request("/api/nodes/heartbeat", {
      method: "POST",
      body: JSON.stringify({ nodeId }),
    }),
};

export const alertsApi = {
  getAll: (): Promise<Alert[]> => request("/api/alerts"),
  resolve: (id: string): Promise<Alert | null> =>
    request(`/api/alerts/${pathSegment(id)}/resolve`, { method: "PATCH" }),
};

export const metricsApi = {
  getByStream: (name: string, limit?: number): Promise<PathMetric[]> =>
    request(
      `/api/metrics/stream/${pathSegment(name)}${limit ? `?limit=${limit}` : ""}`,
    ),
  getNodes: (limit?: number): Promise<NodeMetric[]> =>
    request(`/api/metrics/nodes${limit ? `?limit=${limit}` : ""}`),
};

export const inspectionApi = {
  getAll: (): Promise<StreamInspection[]> => request("/api/stream-inspection"),
  getByStream: (streamName: string): Promise<StreamInspection | null> =>
    request(`/api/stream-inspection/${pathSegment(streamName)}`),
  getHistory: (
    streamName: string,
    limit?: number,
  ): Promise<StreamInspection[]> =>
    request(
      `/api/stream-inspection/${pathSegment(streamName)}/history${limit ? `?limit=${limit}` : ""}`,
    ),
};
