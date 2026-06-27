import { Injectable } from "@nestjs/common";

@Injectable()
export class ConfigService {
    get ingestBaseUrl(): string {
        return process.env.INGEST_MEDIAMTX_BASE_URL ?? "http://localhost:9000";
    }

    get clusterBaseUrl(): string {
        return process.env.CLUSTER_MEDIAMTX_BASE_URL ?? "http://localhost:9001";
    }

    get clusterBaseUrls(): string[] {
        return (process.env.CLUSTER_MEDIAMTX_BASE_URLS ?? this.clusterBaseUrl)
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item);
    }

    get syncPollInterval(): number {
        return Number(process.env.SYNC_POLL_INTERVAL ?? 10000);
    }

    get metricsPollInterval(): number {
        return Number(process.env.METRICS_POLL_INTERVAL ?? 5000);
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
     * RTSP base the cluster nodes pull from to relay an ingest stream.
     * The pull source for a path is `${ingestRtspBaseUrl}/${pathName}`.
     * Include credentials here if the ingest enforces RTSP auth.
     */
    get ingestRtspBaseUrl(): string {
        return (process.env.INGEST_RTSP_URL ?? "rtsp://mediamtx-ingest:8554").replace(/\/+$/, "");
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
