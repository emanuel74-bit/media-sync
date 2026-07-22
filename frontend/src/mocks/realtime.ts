import type { Alert, Stream } from "@/types";

import { db, timestamps } from "./fixtures";

// Mock realtime layer. Installs a fake `window.io` so wsManager connects
// (no backend needed), then a ticker mutates `db` and emits domain events.
// react-query in useRealtimeSync invalidates on each event and refetches from
// the MSW handlers — so the mutated state shows up live in the UI.

const { now } = timestamps;

type SocketListener = (...args: unknown[]) => void;

// Bound to the newest mock socket's dispatcher; ticker emits through it.
let emit: (event: string, payload?: unknown) => void = () => {};
let tickerStarted = false;

function createMockSocket() {
  const listeners = new Map<string, Set<SocketListener>>();
  const fire = (event: string, payload?: unknown) =>
    listeners.get(event)?.forEach((listener) => listener(payload));

  const socket = {
    connected: false,
    connect() {
      socket.connected = true;
      fire("connect");
    },
    disconnect() {
      socket.connected = false;
      fire("disconnect");
    },
    on(event: string, listener: SocketListener) {
      const set = listeners.get(event) ?? new Set<SocketListener>();
      set.add(listener);
      listeners.set(event, set);
    },
  };

  emit = fire;
  // wsManager passes autoConnect: true and registers "connect" right after
  // io() returns; fire on the next tick so those handlers are attached first.
  setTimeout(() => socket.connect(), 50);
  return socket;
}

const pick = <T>(arr: T[]): T | undefined =>
  arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined;
const chance = (p: number) => Math.random() < p;
const jitter = (n: number, pct: number) =>
  Math.round(n * (1 + (Math.random() * 2 - 1) * pct));

let alertSeq = 100;

// One random scenario per tick. Each mutates db, then emits the matching event.
const scenarios: Array<() => void> = [
  // Stream sync + consumer drift
  () => {
    const stream = pick(
      db.streams.filter((s) => s.status !== "created" && s.status !== "reserved"),
    );
    if (!stream) return;
    stream.activeConsumers = Math.max(0, jitter(stream.activeConsumers + 1, 0.4));
    stream.status = "synced";
    stream.lastSeenAt = now();
    stream.lastSyncedAt = now();
    stream.lastError = null;
    stream.updatedAt = now();
    emit("stream.synced", stream satisfies Stream);
  },

  // Assign a pending/discovered stream to a random active cluster node
  () => {
    const stream = pick(
      db.streams.filter((s) => !s.assignedNode && s.status !== "created"),
    );
    const node = pick(
      db.nodes.filter((n) => n.type === "cluster" && n.status === "active"),
    );
    if (!stream || !node) return;
    stream.assignedNode = node.nodeId;
    stream.assignedAt = now();
    stream.status = "assigned";
    stream.updatedAt = now();
    emit("stream.assigned", {
      streamName: stream.name,
      nodeId: node.nodeId,
      assignedAt: stream.assignedAt,
    });
  },

  // Unassign an assigned stream
  () => {
    const stream = pick(db.streams.filter((s) => s.assignedNode));
    if (!stream || chance(0.5)) return; // rarer than assign
    stream.assignedNode = null;
    stream.assignedAt = null;
    stream.status = "pending_assignment";
    stream.updatedAt = now();
    emit("stream.unassigned", stream.name);
  },

  // Raise a new alert
  () => {
    const stream = pick(db.streams);
    if (!stream || !chance(0.5)) return;
    const alert: Alert = {
      id: `alert-${++alertSeq}`,
      source: "metrics",
      subject: stream.name,
      type: "frames_in_error",
      severity: chance(0.3) ? "critical" : "warning",
      message: `${jitter(60, 0.8)} frames in error over last minute`,
      isResolved: false,
      lastSeenAt: now(),
      resolvedAt: null,
      createdAt: now(),
      updatedAt: now(),
    };
    db.alerts.unshift(alert);
    emit("alert.created", alert);
  },

  // Resolve an open alert
  () => {
    const alert = pick(db.alerts.filter((a) => !a.isResolved));
    if (!alert) return;
    alert.isResolved = true;
    alert.resolvedAt = now();
    alert.updatedAt = now();
    emit("alert.resolved", alert);
  },

  // New inspection for a stream
  () => {
    const name = pick(Object.keys(db.inspectionsByStream));
    if (!name) return;
    const history = db.inspectionsByStream[name];
    const prev = history[0];
    if (!prev) return;
    const fresh = {
      ...prev,
      source:
        prev.source === "ingest" ? ("cluster" as const) : ("ingest" as const),
      inspectedAt: now(),
      updatedAt: now(),
      createdAt: now(),
    };
    history.unshift(fresh);
    if (history.length > 12) history.pop();
    emit("stream.inspected", fresh);
  },

  // Node heartbeat: revive an inactive/draining node
  () => {
    const node = pick(db.nodes.filter((n) => n.status !== "active"));
    if (!node || !chance(0.4)) return;
    node.status = "active";
    node.lastHeartbeatAt = now();
    node.updatedAt = now();
    emit("node.registered", node);
  },
];

function startTicker() {
  if (tickerStarted) return;
  tickerStarted = true;
  const tick = () => {
    pick(scenarios)?.();
    // Randomized cadence so the UI feels organic, not metronomic.
    setTimeout(tick, 2500 + Math.random() * 3500);
  };
  setTimeout(tick, 2000);
}

export function startMockRealtime(): void {
  window.io = ((_url: string, _options?: Record<string, unknown>) =>
    createMockSocket()) as Window["io"];
  startTicker();
}
