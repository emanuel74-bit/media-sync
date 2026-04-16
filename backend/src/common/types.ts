/**
 * Shared domain enums used across the entire backend.
 * Import from here instead of re-declaring string unions in individual files.
 */

/** Which side of the media architecture a pod or stream context belongs to. */
export enum PodRole {
    INGEST = "ingest",
    CLUSTER = "cluster",
}

/** Lifecycle states a pod can be in. */
export enum PodStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    DRAINING = "draining",
}

/** All possible lifecycle states for a stream record. */
export enum StreamStatus {
    CREATED = "created",
    DISCOVERED = "discovered",
    PENDING_ASSIGNMENT = "pending_assignment",
    ASSIGNED = "assigned",
    SYNCED = "synced",
    SYNC_ERROR = "sync_error",
    STALE = "stale",
}

/** Media track types found inside a stream. */
export enum TrackType {
    VIDEO = "video",
    AUDIO = "audio",
    DATA = "data",
    SUBTITLE = "subtitle",
}

/** Describes a single media track within a stream, used in events and inspection records. */
export interface StreamTrack {
    type: TrackType;
    codec?: string;
    language?: string;
    bitrate?: number;
    width?: number;
    height?: number;
    fps?: number;
    channels?: number;
    sampleRate?: number;
}

/** Severity level assigned to generated alerts. */
export enum AlertSeverity {
    INFO = "info",
    WARNING = "warning",
    CRITICAL = "critical",
}

/** Known alert type identifiers produced by the system. */
export enum AlertType {
    BITRATE_LOW = "bitrate_low",
    PACKET_LOSS = "packet_loss",
    LATENCY_HIGH = "latency_high",
    MISSING_VIDEO_TRACK = "missing_video_track",
    MISSING_AUDIO_TRACK = "missing_audio_track",
    UNEXPECTED_TRACK_TYPES = "unexpected_track_types",
}
