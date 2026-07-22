import { Injectable } from "@nestjs/common";

@Injectable()
export class ConfigService {
    /**
     * HTTP API credentials (`user:pass`, or `""` when the node needs none) the transport
     * layer attaches to every ingest-node client. Registered nodes report only host/IP, so
     * auth cannot come from the node list — it is per-deployment transport config.
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

    get nodeHeartbeatToleranceSeconds(): number {
        return Number(process.env.NODE_HEALTH_TOLERANCE_SECONDS ?? 120);
    }

    get ingestNodeMediaMtxPort(): number {
        return Number(process.env.INGEST_NODE_MEDIAMTX_PORT ?? 9000);
    }

    get clusterNodeMediaMtxPort(): number {
        return Number(process.env.CLUSTER_NODE_MEDIAMTX_PORT ?? 9000);
    }

    /** Port of the MediaMTX Prometheus metrics endpoint on every node (ingest + cluster). */
    get mediaMtxMetricsPort(): number {
        return Number(process.env.MEDIAMTX_METRICS_PORT ?? 9998);
    }

    /**
     * Default MediaMTX RTSP port, used to build a node's pull/publish URL when a node did
     * not self-report its own `rtspPort`. Per-node ports (several nodes per VM) come from
     * the node registration; these role/global getters are the fallback (see `NodeResolver`).
     */
    get mediaMtxRtspPort(): number {
        return Number(process.env.MEDIAMTX_RTSP_PORT ?? 8554);
    }

    /**
     * How long a reserved publish slot is held before it expires if no media arrives. The sync
     * loop's TTL GC frees expired `RESERVED` streams. Override via `INGEST_RESERVATION_TTL_MS`.
     */
    get ingestReservationTtlMs(): number {
        return Number(process.env.INGEST_RESERVATION_TTL_MS ?? 300_000);
    }

    /**
     * RTSP username an ingest node presents to the sync auth endpoint (`/api/ingest/auth`) when
     * a client publishes. The client's publish URL embeds this user plus the per-reservation
     * secret; the endpoint validates the secret against the reservation. Override via
     * `INGEST_PUBLISH_USER`.
     */
    get ingestPublishUser(): string {
        return process.env.INGEST_PUBLISH_USER ?? "publish";
    }

    /** Node-resource alert thresholds (percent); a node over any of these raises a node alert. */
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
