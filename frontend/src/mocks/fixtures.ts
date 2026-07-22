import type {
  Alert,
  Node,
  NodeMetric,
  PathMetric,
  Stream,
  StreamInspection,
} from "@/types";

// Mutable in-memory dataset backing the mock handlers. Resets per page load.
const now = () => new Date().toISOString();
const minutesAgo = (m: number) =>
  new Date(Date.now() - m * 60_000).toISOString();
const minutesAhead = (m: number) =>
  new Date(Date.now() + m * 60_000).toISOString();

export const db = {
  // Streams cover every StreamStatus + manual/auto, assigned/unassigned,
  // reserved (token), error, stale, and varied metadata.
  streams: [
    {
      name: "camera/lobby",
      source: "rtsp://ingest/camera/lobby",
      status: "synced",
      metadata: {
        codec: "h264",
        width: 1920,
        height: 1080,
        fps: 30,
        bytesReceived: 984_000_000,
        bytesSent: 812_000_000,
        readers: 3,
        hasExpectedVideo: true,
        hasExpectedAudio: true,
      },
      isEnabled: true,
      lastSeenAt: minutesAgo(0),
      lastSyncedAt: minutesAgo(1),
      lastError: null,
      activeConsumers: 3,
      isManual: false,
      ingestNode: "ingest-node-1",
      assignedNode: "cluster-node-1",
      assignedAt: minutesAgo(45),
      createdAt: minutesAgo(240),
      updatedAt: minutesAgo(1),
    },
    {
      name: "camera/garage",
      source: "rtsp://ingest/camera/garage",
      status: "assigned",
      metadata: {
        codec: "h265",
        width: 1280,
        height: 720,
        fps: 25,
        hasExpectedVideo: true,
        hasExpectedAudio: false,
      },
      isEnabled: true,
      lastSeenAt: minutesAgo(2),
      lastSyncedAt: null,
      lastError: null,
      activeConsumers: 1,
      isManual: false,
      ingestNode: "ingest-node-1",
      assignedNode: "cluster-node-1",
      assignedAt: minutesAgo(10),
      createdAt: minutesAgo(120),
      updatedAt: minutesAgo(2),
    },
    {
      name: "camera/roof",
      source: "rtsp://ingest/camera/roof",
      status: "sync_error",
      metadata: { codec: "h264", hasExpectedVideo: true },
      isEnabled: false,
      lastSeenAt: minutesAgo(18),
      lastSyncedAt: minutesAgo(52),
      lastError: "cluster node unreachable: dial tcp 10.0.0.22:9000 timeout",
      activeConsumers: 0,
      isManual: false,
      ingestNode: "ingest-node-2",
      assignedNode: "cluster-node-2",
      assignedAt: minutesAgo(70),
      createdAt: minutesAgo(300),
      updatedAt: minutesAgo(18),
    },
    {
      name: "camera/entrance",
      source: "rtsp://ingest/camera/entrance",
      status: "pending_assignment",
      metadata: { codec: "h264", width: 1920, height: 1080, fps: 30 },
      isEnabled: true,
      lastSeenAt: minutesAgo(1),
      lastSyncedAt: null,
      lastError: null,
      activeConsumers: 0,
      isManual: false,
      ingestNode: "ingest-node-2",
      assignedNode: null,
      assignedAt: null,
      createdAt: minutesAgo(35),
      updatedAt: minutesAgo(1),
    },
    {
      name: "camera/warehouse",
      source: "rtsp://ingest/camera/warehouse",
      status: "stale",
      metadata: { codec: "h264", width: 640, height: 480, fps: 15 },
      isEnabled: true,
      lastSeenAt: minutesAgo(240),
      lastSyncedAt: minutesAgo(240),
      lastError: null,
      activeConsumers: 0,
      isManual: false,
      ingestNode: "ingest-node-1",
      assignedNode: "cluster-node-3",
      assignedAt: minutesAgo(600),
      createdAt: minutesAgo(1440),
      updatedAt: minutesAgo(240),
    },
    {
      name: "camera/dock",
      source: "rtsp://ingest/camera/dock",
      status: "discovered",
      metadata: { codec: "h264" },
      isEnabled: true,
      lastSeenAt: minutesAgo(3),
      lastSyncedAt: null,
      lastError: null,
      activeConsumers: 0,
      isManual: false,
      ingestNode: "ingest-node-2",
      assignedNode: null,
      assignedAt: null,
      createdAt: minutesAgo(6),
      updatedAt: minutesAgo(3),
    },
    {
      name: "camera/parking",
      source: "rtsp://publisher/camera/parking",
      status: "reserved",
      metadata: {},
      isEnabled: true,
      lastSeenAt: null,
      lastSyncedAt: null,
      lastError: null,
      activeConsumers: 0,
      isManual: true,
      ingestNode: "ingest-node-1",
      assignedNode: null,
      assignedAt: null,
      reservedUntil: minutesAhead(4),
      publishToken: "rsv_9f3c2a7be1",
      createdAt: minutesAgo(1),
      updatedAt: minutesAgo(1),
    },
    {
      name: "camera/office",
      source: "rtsp://ingest/camera/office",
      status: "created",
      metadata: {},
      isEnabled: false,
      lastSeenAt: null,
      lastSyncedAt: null,
      lastError: null,
      activeConsumers: 0,
      isManual: true,
      ingestNode: null,
      assignedNode: null,
      assignedAt: null,
      createdAt: minutesAgo(2),
      updatedAt: minutesAgo(2),
    },
  ] as Stream[],

  // Both roles, every NodeStatus (active/draining/inactive), 2 ingest + 4 cluster.
  nodes: [
    node("ingest-node-1", "10.0.0.11", "ingest", "active", 0),
    node("ingest-node-2", "10.0.0.12", "ingest", "active", 0),
    node("cluster-node-1", "10.0.0.21", "cluster", "active", 0),
    node("cluster-node-2", "10.0.0.22", "cluster", "active", 1),
    node("cluster-node-3", "10.0.0.23", "cluster", "draining", 2),
    node("cluster-node-4", "10.0.0.24", "cluster", "inactive", 12),
  ] as Node[],

  // Every AlertType, all severities + sources, incl. one resolved.
  alerts: [
    alert("alert-1", "inspection", "camera/roof", "stream_not_ready", "critical", "Stream not ready on cluster-node-2 for 18m", false, 20, 5),
    alert("alert-2", "metrics", "camera/warehouse", "frames_in_error", "warning", "142 frames in error over last minute", false, 30, 4),
    alert("alert-3", "inspection", "camera/dock", "missing_video_track", "warning", "Expected video track absent", false, 12, 3),
    alert("alert-4", "inspection", "camera/garage", "missing_audio_track", "info", "Audio track absent (expected for h265 source)", false, 15, 6),
    alert("alert-5", "inspection", "camera/office", "unexpected_track_types", "warning", "Found data track not in expected set", false, 8, 2),
    alert("alert-6", "node", "cluster-node-1", "node_cpu_high", "warning", "CPU at 91% for 5m", false, 9, 1),
    alert("alert-7", "node", "cluster-node-3", "node_memory_high", "critical", "Memory at 96%, node draining", false, 25, 2),
    alert("alert-8", "node", "cluster-node-2", "node_disk_high", "info", "Disk at 78%", true, 180, 60),
  ] as Alert[],

  // Inspection history per stream, newest first. Covers ingest+cluster sources,
  // video/audio/subtitle/data tracks, error cases, encoder metadata.
  inspectionsByStream: {
    "camera/lobby": [
      inspection("camera/lobby", "cluster", 1, null, { encoder: "GStreamer 1.22" }, [
        track("video", { codec: "h264", width: 1920, height: 1080, fps: 30, bitrate: 4200 }),
        track("audio", { codec: "aac", channels: 2, sampleRate: 48000, bitrate: 128 }),
      ]),
      inspection("camera/lobby", "ingest", 6, null, { encoder: "GStreamer 1.22" }, [
        track("video", { codec: "h264", width: 1920, height: 1080, fps: 30, bitrate: 4300 }),
        track("audio", { codec: "aac", channels: 2, sampleRate: 48000, bitrate: 128 }),
      ]),
      inspection("camera/lobby", "cluster", 31, null, {}, [
        track("video", { codec: "h264", width: 1920, height: 1080, fps: 30, bitrate: 4100 }),
        track("audio", { codec: "aac", channels: 2, sampleRate: 48000, bitrate: 128 }),
      ]),
    ],
    "camera/garage": [
      inspection("camera/garage", "cluster", 2, null, {}, [
        track("video", { codec: "h265", width: 1280, height: 720, fps: 25, bitrate: 2100 }),
        track("subtitle", { codec: "webvtt", language: "en" }),
      ]),
      inspection("camera/garage", "ingest", 12, "audio track missing from source", {}, [
        track("video", { codec: "h265", width: 1280, height: 720, fps: 25, bitrate: 2100 }),
        track("data", { codec: "klv" }),
      ]),
    ],
    "camera/roof": [
      inspection("camera/roof", "ingest", 18, "probe timeout after 10s: no packets received", {}, []),
      inspection("camera/roof", "cluster", 55, "cluster node unreachable", {}, [
        track("video", { codec: "h264", width: 1920, height: 1080, fps: 30, bitrate: 3800 }),
      ]),
    ],
    "camera/dock": [
      inspection("camera/dock", "ingest", 3, "expected video track absent", {}, [
        track("audio", { codec: "opus", channels: 1, sampleRate: 16000, bitrate: 24 }),
      ]),
    ],
    "camera/warehouse": [
      inspection("camera/warehouse", "cluster", 240, null, { encoder: "libx264" }, [
        track("video", { codec: "h264", width: 640, height: 480, fps: 15, bitrate: 700 }),
      ]),
    ],
  } as Record<string, StreamInspection[]>,
};

// --- metric time-series generators (read-only, computed per request) ---

const seriesNodeByContext: Record<PathMetric["context"], string> = {
  ingest: "ingest-node-1",
  cluster: "cluster-node-1",
};

// Small stable per-name offset so distinct streams/nodes get distinct shapes.
const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return h / 100;
};

// Newest-first list of `limit` points; alternates ingest/cluster context so the
// UI's context filter (all/ingest/cluster) has data on both sides. Values wave.
export function pathMetricSeries(
  streamName: string,
  limit: number,
): PathMetric[] {
  const out: PathMetric[] = [];
  // Per-stream seed so different streams get distinct-but-stable shapes,
  // while a per-call noise term makes each poll drift (feels live).
  const seed = hash(streamName);
  for (let i = 0; i < limit; i++) {
    const context: PathMetric["context"] = i % 2 === 0 ? "cluster" : "ingest";
    const phase = i / 6 + seed;
    const noise = 1 + (Math.random() * 2 - 1) * 0.08;
    const base = (8_000_000 + Math.sin(phase) * 3_000_000) * noise;
    const notReady = i % (13 + (seed % 7)) === 0;
    out.push({
      streamName,
      context,
      node: seriesNodeByContext[context],
      state: notReady ? "notReady" : "ready",
      ready: !notReady,
      bytesReceived: Math.round(base + i * 45_000),
      bytesSent: Math.round(base * 0.82 + i * 38_000),
      readers: Math.max(0, Math.round(3 + Math.sin(phase) * 2 + Math.random())),
      framesInError: i % 23 === 0 ? Math.ceil(Math.random() * 6) : 0,
      createdAt: minutesAgo(i),
    });
  }
  return out;
}

export function nodeMetricSeries(limit: number): NodeMetric[] {
  const clusterNodes = ["cluster-node-1", "cluster-node-2", "cluster-node-3"];
  const out: NodeMetric[] = [];
  for (let i = 0; i < limit; i++) {
    const node = clusterNodes[i % clusterNodes.length];
    const phase = i / 5 + hash(node);
    out.push({
      context: "cluster",
      node,
      paths: 3 + (i % 3),
      rtspConns: Math.round(5 + Math.sin(phase) * 3 + Math.random() * 2) + 2,
      rtspSessions: Math.round(4 + Math.sin(phase) * 2 + Math.random()) + 1,
      rtmpConns: 0,
      srtConns: i % 4 === 0 ? 1 : 0,
      webrtcSessions: Math.round(1 + Math.abs(Math.sin(phase)) * 2),
      hlsMuxers: 2 + (i % 2),
      createdAt: minutesAgo(i),
    });
  }
  return out;
}

export const timestamps = { now, minutesAgo, minutesAhead };

// --- builders (keep the data blocks above terse) ---

function node(
  nodeId: string,
  host: string,
  type: Node["type"],
  status: Node["status"],
  heartbeatMinAgo: number,
): Node {
  return {
    nodeId,
    host,
    apiPort: 9000,
    rtspPort: 8554,
    metricsPort: 9998,
    type,
    status,
    lastHeartbeatAt: minutesAgo(heartbeatMinAgo),
    createdAt: minutesAgo(1440),
    updatedAt: minutesAgo(heartbeatMinAgo),
  };
}

function alert(
  id: string,
  source: Alert["source"],
  subject: string,
  type: Alert["type"],
  severity: Alert["severity"],
  message: string,
  isResolved: boolean,
  createdMinAgo: number,
  seenMinAgo: number,
): Alert {
  return {
    id,
    source,
    subject,
    type,
    severity,
    message,
    isResolved,
    lastSeenAt: minutesAgo(seenMinAgo),
    resolvedAt: isResolved ? minutesAgo(seenMinAgo) : null,
    createdAt: minutesAgo(createdMinAgo),
    updatedAt: minutesAgo(seenMinAgo),
  };
}

function track(
  type: StreamInspection["tracks"][number]["type"],
  fields: Partial<StreamInspection["tracks"][number]>,
): StreamInspection["tracks"][number] {
  return { type, ...fields };
}

function inspection(
  streamName: string,
  source: StreamInspection["source"],
  inspectedMinAgo: number,
  lastError: string | null,
  metadata: Record<string, unknown>,
  tracks: StreamInspection["tracks"],
): StreamInspection {
  return {
    streamName,
    source,
    tracks,
    metadata,
    lastError,
    inspectedAt: minutesAgo(inspectedMinAgo),
    createdAt: minutesAgo(inspectedMinAgo),
    updatedAt: minutesAgo(inspectedMinAgo),
  };
}
