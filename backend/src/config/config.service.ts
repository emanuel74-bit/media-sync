import { Injectable } from "@nestjs/common";

@Injectable()
export class ConfigService {
    /**
     * HTTP API credentials (`user:pass`, or `""` when the node needs none) the transport
     * layer attaches to every ingest-node client. Registered pods report only host/IP, so
     * auth cannot come from the pod list — it is per-deployment transport config.
     */
    get ingestNodeAuth(): string {
        return process.env.INGEST_MEDIAMTX_AUTH ?? "";
    }

    /** HTTP API credentials (`user:pass`, or `""`) attached to every cluster-node client. */
    get clusterNodeAuth(): string {
        return process.env.CLUSTER_MEDIAMTX_AUTH ?? "";
    }

    get syncPollInterval(): number {
        return Number(process.env.SYNC_POLL_INTERVAL ?? 10000);
    }

    get metricsPollInterval(): number {
        return Number(process.env.METRICS_POLL_INTERVAL ?? 10000);
    }

    get inspectionInterval(): number {
        return Number(process.env.INSPECTION_INTERVAL ?? 30000);
    }

    get podHeartbeatToleranceSeconds(): number {
        return Number(process.env.POD_HEALTH_TOLERANCE_SECONDS ?? 120);
    }

    get ingestPodMediaMtxPort(): number {
        return Number(process.env.INGEST_POD_MEDIAMTX_PORT ?? 9000);
    }

    get clusterPodMediaMtxPort(): number {
        return Number(process.env.CLUSTER_POD_MEDIAMTX_PORT ?? 9000);
    }

    /** Port of the MediaMTX Prometheus metrics endpoint on every node (ingest + cluster). */
    get mediaMtxMetricsPort(): number {
        return Number(process.env.MEDIAMTX_METRICS_PORT ?? 9998);
    }

    /**
     * The stable ingest relay endpoint (a Service/DNS, not a pod) that cluster nodes pull
     * an ingest stream from over RTSP — media plane, so config not pod discovery (ARCH-11).
     * `NodeResolver.getIngestPullUrl` owns the path-join convention.
     * Include credentials here if the ingest enforces RTSP auth.
     */
    get ingestRtspBaseUrl(): string {
        return (process.env.INGEST_RTSP_URL ?? "rtsp://mediamtx-ingest:8554").replace(/\/+$/, "");
    }

    /**
     * Protocols a cluster node can pull a stream from directly — when a stream's stored
     * source starts with one of these (`<proto>://…`), it is used as-is instead of relaying
     * from the ingest. Extend via `PULLABLE_SOURCE_PROTOCOLS` (comma-separated). Consumers
     * compile these into a matcher once at startup (see `MediaMtxPipelineService`).
     */
    get pullableSourceProtocols(): string[] {
        return (process.env.PULLABLE_SOURCE_PROTOCOLS ?? "rtsp,rtsps,rtmp,rtmps,srt,http,https,udp")
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item);
    }

    /** Node-resource alert thresholds (percent); a pod over any of these raises a node alert. */
    get nodeCpuHighThreshold(): number {
        return Number(process.env.NODE_CPU_HIGH_PERCENT ?? 85);
    }

    get nodeMemoryHighThreshold(): number {
        return Number(process.env.NODE_MEMORY_HIGH_PERCENT ?? 90);
    }

    get nodeDiskHighThreshold(): number {
        return Number(process.env.NODE_DISK_HIGH_PERCENT ?? 85);
    }
}
