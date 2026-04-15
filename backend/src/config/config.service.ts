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

    get bitrateDropPercent(): number {
        return Number(process.env.ALERT_BITRATE_DROP_PERCENT ?? 30);
    }

    get staleSeconds(): number {
        return Number(process.env.ALERT_STALE_SECONDS ?? 60);
    }

    get inspectionInterval(): number {
        return Number(process.env.INSPECTION_INTERVAL ?? 30000);
    }

    get podHeartbeatToleranceSeconds(): number {
        return Number(process.env.POD_HEALTH_TOLERANCE_SECONDS ?? 120);
    }

    get alertBitrateLowThreshold(): number {
        return Number(process.env.ALERT_BITRATE_LOW ?? 500);
    }

    get alertPacketLossThreshold(): number {
        return Number(process.env.ALERT_PACKET_LOSS ?? 2);
    }

    get alertLatencyHighThreshold(): number {
        return Number(process.env.ALERT_LATENCY_HIGH ?? 1000);
    }

    get ingestPodMediaMtxPort(): number {
        return Number(process.env.INGEST_POD_MEDIAMTX_PORT ?? 9000);
    }
}
