export type StreamStatus =
  | "created"
  | "reserved"
  | "discovered"
  | "pending_assignment"
  | "assigned"
  | "synced"
  | "sync_error"
  | "stale";

export type NodeRole = "ingest" | "cluster";
export type NodeStatus = "active" | "inactive" | "draining";
export type AlertSource = "metrics" | "inspection" | "node";
export type AlertSeverity = "info" | "warning" | "critical";
export type AlertType =
  | "stream_not_ready"
  | "frames_in_error"
  | "missing_video_track"
  | "missing_audio_track"
  | "unexpected_track_types"
  | "node_cpu_high"
  | "node_memory_high"
  | "node_disk_high";

export interface StreamMetadata {
  codec?: string;
  width?: number;
  height?: number;
  fps?: number;
  channels?: number;
  sampleRate?: number;
  bytesReceived?: number;
  bytesSent?: number;
  readers?: number;
  hasExpectedVideo?: boolean;
  hasExpectedAudio?: boolean;
  [key: string]: unknown;
}

export interface Stream {
  name: string;
  source: string;
  status: StreamStatus;
  metadata: StreamMetadata;
  isEnabled: boolean;
  lastSeenAt?: string | null;
  lastSyncedAt?: string | null;
  lastError?: string | null;
  activeConsumers: number;
  isManual: boolean;
  ingestNode?: string | null;
  reservedUntil?: string | null;
  publishToken?: string | null;
  assignedNode?: string | null;
  assignedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Alert {
  id: string;
  source: AlertSource;
  subject: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  isResolved: boolean;
  lastSeenAt?: string;
  resolvedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PathMetric {
  streamName: string;
  context: NodeRole;
  node: string;
  state: string;
  ready: boolean;
  bytesReceived: number;
  bytesSent: number;
  readers: number;
  framesInError: number;
  createdAt?: string;
}

export interface NodeMetric {
  context: NodeRole;
  node: string;
  paths: number;
  rtspConns: number;
  rtspSessions: number;
  rtmpConns: number;
  srtConns: number;
  webrtcSessions: number;
  hlsMuxers: number;
  createdAt?: string;
}

export interface Node {
  nodeId: string;
  host: string;
  apiPort: number;
  rtspPort: number;
  metricsPort: number;
  type: NodeRole;
  status: NodeStatus;
  lastHeartbeatAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StreamTrack {
  type: "video" | "audio" | "data" | "subtitle";
  codec?: string;
  language?: string;
  bitrate?: number;
  width?: number;
  height?: number;
  fps?: number;
  channels?: number;
  sampleRate?: number;
}

export interface StreamInspection {
  streamName: string;
  source: NodeRole;
  tracks: StreamTrack[];
  metadata: Record<string, unknown>;
  lastError: string | null;
  inspectedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StreamAssignment {
  name: string;
  assignedNode?: string | null;
  assignedAt?: string | null;
  status: StreamStatus;
}

export interface StreamReservation {
  name: string;
  ingestNode: string;
  publishUrl: string;
  publishToken: string;
  expiresAt: string;
}

export interface StreamAssignedEvent {
  streamName: string;
  nodeId: string;
  assignedAt?: string | null;
}
