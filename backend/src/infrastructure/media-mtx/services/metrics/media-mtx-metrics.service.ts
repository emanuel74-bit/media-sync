import { Inject, Injectable, Logger, forwardRef } from "@nestjs/common";

import { PodRole } from "@/common";
import { ConfigService } from "@/config";
import { PodQueryService } from "@/pods";

import { MediaMtxMetricsClient } from "../../clients";
import { MediaMtxMetricsSnapshot } from "../../types";
import { parsePrometheusText, mapMetricsToSnapshot } from "../../mappers";

interface MetricsTarget {
    context: PodRole;
    nodeId: string;
    url: string;
}

/**
 * Scrapes the Prometheus /metrics endpoint of every MediaMTX node (ingest + cluster)
 * and returns a per-node operational snapshot. Node set is resolved from the live pod
 * registry, falling back to the configured base URLs; per-node failures are isolated.
 */
@Injectable()
export class MediaMtxMetricsService {
    private readonly logger = new Logger(MediaMtxMetricsService.name);
    private readonly clients = new Map<string, MediaMtxMetricsClient>();

    constructor(
        // forwardRef: infra consumers of PodQueryService capture an undefined token
        // if they decorate while the infra↔pods barrel cycle is mid-evaluation (ADR-0008).
        @Inject(forwardRef(() => PodQueryService))
        private readonly podsService: PodQueryService,
        private readonly config: ConfigService,
    ) {}

    async collect(): Promise<MediaMtxMetricsSnapshot[]> {
        const targets = await this.resolveTargets();
        const snapshots: MediaMtxMetricsSnapshot[] = [];
        for (const target of targets) {
            const snapshot = await this.scrape(target);
            if (snapshot) {
                snapshots.push(snapshot);
            }
        }
        return snapshots;
    }

    private async scrape(target: MetricsTarget): Promise<MediaMtxMetricsSnapshot | null> {
        try {
            const text = await this.clientFor(target.url).fetchMetricsText();
            return mapMetricsToSnapshot(parsePrometheusText(text), target.context, target.nodeId);
        } catch (error) {
            this.logger.warn(
                `Failed to scrape metrics from ${target.context} node ${target.nodeId}: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
            return null;
        }
    }

    private async resolveTargets(): Promise<MetricsTarget[]> {
        const [ingest, cluster] = await Promise.all([
            this.targetsForRole(PodRole.INGEST, this.config.ingestBaseUrl, [
                this.config.ingestBaseUrl,
            ]),
            this.targetsForRole(
                PodRole.CLUSTER,
                this.config.clusterBaseUrl,
                this.config.clusterBaseUrls,
            ),
        ]);
        return [...ingest, ...cluster];
    }

    private async targetsForRole(
        role: PodRole,
        credentialsSource: string,
        fallbackUrls: string[],
    ): Promise<MetricsTarget[]> {
        const auth = this.credentialsFrom(credentialsSource);
        const pods = await this.podsService.listActivePodRefs(role);
        if (pods.length > 0) {
            return pods.map((pod) => ({
                context: role,
                nodeId: pod.podId,
                url: this.metricsUrl(auth, pod.host),
            }));
        }
        return fallbackUrls.map((url) => {
            const host = this.hostOf(url);
            return { context: role, nodeId: host, url: this.metricsUrl(auth, host) };
        });
    }

    private clientFor(url: string): MediaMtxMetricsClient {
        let client = this.clients.get(url);
        if (!client) {
            client = new MediaMtxMetricsClient(url);
            this.clients.set(url, client);
        }
        return client;
    }

    private metricsUrl(auth: string, host: string): string {
        return `http://${auth}${host}:${this.config.mediaMtxMetricsPort}`;
    }

    private credentialsFrom(baseUrl: string): string {
        try {
            const url = new URL(baseUrl);
            return url.username ? `${url.username}:${url.password}@` : "";
        } catch {
            return "";
        }
    }

    private hostOf(baseUrl: string): string {
        try {
            return new URL(baseUrl).hostname;
        } catch {
            return baseUrl;
        }
    }
}
