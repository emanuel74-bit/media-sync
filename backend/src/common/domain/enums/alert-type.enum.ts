/** Known alert type identifiers produced by the system. */
export enum AlertType {
    // Operational (source: metrics) — derived from MediaMTX node/path metrics.
    STREAM_NOT_READY = "stream_not_ready",
    FRAMES_IN_ERROR = "frames_in_error",
    // Content (source: inspection) — derived from per-stream track probing.
    MISSING_VIDEO_TRACK = "missing_video_track",
    MISSING_AUDIO_TRACK = "missing_audio_track",
    UNEXPECTED_TRACK_TYPES = "unexpected_track_types",
    // Node resources (source: node) — derived from node-reported host metrics.
    NODE_CPU_HIGH = "node_cpu_high",
    NODE_MEMORY_HIGH = "node_memory_high",
    NODE_DISK_HIGH = "node_disk_high",
}
