import { NodeRole, NodeMetricSample, PathMetricSample } from "@/common";

import { PrometheusSample, MediaMtxMetricsSnapshot } from "../types";

/** Per-path metric family → the PathMetricSample field it feeds. */
const PATH_FIELD: Record<string, keyof PathMetricSample> = {
    paths_bytes_received: "bytesReceived",
    paths_bytes_sent: "bytesSent",
    paths_readers: "readers",
    paths_inbound_frames_in_error: "framesInError",
};

/** Count a node-level family: sum the values of all series with exactly that name. */
function countByName(samples: PrometheusSample[], name: string): number {
    return samples.reduce((total, s) => (s.name === name ? total + s.value : total), 0);
}

function mapNodeMetrics(
    samples: PrometheusSample[],
    context: NodeRole,
    node: string,
): NodeMetricSample {
    return {
        context,
        node,
        paths: countByName(samples, "paths"),
        rtspConns: countByName(samples, "rtsp_conns"),
        rtspSessions: countByName(samples, "rtsp_sessions"),
        rtmpConns: countByName(samples, "rtmp_conns"),
        srtConns: countByName(samples, "srt_conns"),
        webrtcSessions: countByName(samples, "webrtc_sessions"),
        hlsMuxers: countByName(samples, "hls_muxers"),
    };
}

function emptyPathMetrics(streamName: string, context: NodeRole, node: string): PathMetricSample {
    return {
        streamName,
        context,
        node,
        state: "unknown",
        ready: false,
        bytesReceived: 0,
        bytesSent: 0,
        readers: 0,
        framesInError: 0,
    };
}

function mapPathMetrics(
    samples: PrometheusSample[],
    context: NodeRole,
    node: string,
): PathMetricSample[] {
    const byPath = new Map<string, PathMetricSample>();

    const forPath = (name: string): PathMetricSample | undefined => {
        if (!name) {
            return undefined;
        }
        let path = byPath.get(name);
        if (!path) {
            path = emptyPathMetrics(name, context, node);
            byPath.set(name, path);
        }
        return path;
    };

    for (const sample of samples) {
        const name = sample.labels.name;
        if (sample.name === "paths") {
            const path = forPath(name);
            if (path) {
                path.state = sample.labels.state ?? "unknown";
                path.ready = path.state === "ready";
            }
            continue;
        }
        const field = PATH_FIELD[sample.name];
        if (field) {
            const path = forPath(name);
            if (path) {
                (path[field] as number) = sample.value;
            }
        }
    }

    return [...byPath.values()];
}

/** Map one node's parsed /metrics samples into a node + per-path snapshot. */
export function mapMetricsToSnapshot(
    samples: PrometheusSample[],
    context: NodeRole,
    node: string,
): MediaMtxMetricsSnapshot {
    return {
        node: mapNodeMetrics(samples, context, node),
        paths: mapPathMetrics(samples, context, node),
    };
}
