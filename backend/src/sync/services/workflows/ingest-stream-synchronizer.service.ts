import { Injectable } from "@nestjs/common";

import { NodeQueryService } from "@/nodes";
import { NodeRole, StreamStatus } from "@/common";
import { Stream, StreamMetadata, StreamsFacadeService } from "@/streams";

import { SyncContext, SyncDiscoveredStream } from "../../domain";

/**
 * The mirror of `StreamReservationService.reserve` — the ingest→cluster relay. Runs two ways:
 *
 *  - **periodic** (`execute`): every sync tick, over all streams currently live on ingest;
 *  - **targeted** (`activate`): on demand for one stream, driven by an ingest node's
 *    `runOnReady` hook the moment it goes live — low latency, no whole-cluster scan.
 *
 * Reserve only records the slot; **nothing provisions the path on the ingest node**. The client
 * publishes straight to the reserved ingest node, whose MediaMTX accepts any path via its
 * catch-all (`all_others`) and authorizes the publish through `POST /api/ingest/auth`. The path
 * therefore materializes on the ingest node the moment media flows — no API call from us.
 *
 * Either way, for a stream now live on an ingest node it: records it (shedding the reservation
 * marker), assigns it to a cluster node, and tells that cluster node's MediaMTX to pull the
 * stream from its ingest node — the relay (`deployClusterPipeline` → `buildClusterPullPipeline`).
 */
@Injectable()
export class IngestStreamSynchronizerService {
    constructor(
        private readonly streams: StreamsFacadeService,
        private readonly nodes: NodeQueryService,
    ) {}

    async execute(context: SyncContext): Promise<void> {
        for (const ingest of context.ingestList) {
            await this.relayIngestStreamToCluster(ingest, context.clusterNames, context.nodeIds);
        }
    }

    /**
     * Relay one just-published stream to the cluster now (the activation hook). Uses only the
     * hook's `(ingestNodeId, name)` — no node fan-out; source and track metadata are left absent
     * (the reservation's source is preserved, the periodic sync/inspection fills the tracks).
     */
    async activate(ingestNodeId: string, name: string): Promise<void> {
        await this.upsertDiscoveredStream({
            name,
            ingestNode: ingestNodeId,
            status: StreamStatus.DISCOVERED,
        });

        const clusterNodes = await this.nodes.listActiveNodeIds(NodeRole.CLUSTER);
        if (!clusterNodes.length) {
            return; // no cluster nodes yet — the periodic sync will relay it later
        }

        const assigned = await this.streams.ensureAssigned(name, clusterNodes);
        await this.streams.deployClusterPipeline(assigned);
    }

    private async relayIngestStreamToCluster(
        ingest: SyncDiscoveredStream,
        clusterNames: Set<string>,
        clusterNodeIds: string[],
    ): Promise<void> {
        const discovered = await this.upsertDiscoveredStream(ingest);
        const assigned = await this.streams.ensureAssigned(discovered.name, clusterNodeIds);

        const alreadyRelayed = clusterNames.has(assigned.name);
        if (!alreadyRelayed) {
            // Create the relay: the assigned cluster node pulls this stream from its ingest node.
            await this.streams.deployClusterPipeline(assigned);
        }
    }

    /**
     * Turn a live-on-ingest observation into a persisted `Stream`: shed the reservation marker
     * (`reservedUntil: null`) now that media has arrived and stamp it seen. `source` and track
     * metadata are set only when the observation carries them — a targeted activation omits both,
     * preserving the reserved source and leaving the tracks for the next tick. Upsert so a
     * re-discovered stream is refreshed, not duplicated.
     */
    private async upsertDiscoveredStream(ingest: SyncDiscoveredStream): Promise<Stream> {
        const data: Partial<Stream> & { name: string } = {
            name: ingest.name,
            ingestNode: ingest.ingestNode,
            reservedUntil: null,
            lastSeenAt: new Date(),
            isEnabled: true,
        };
        if (ingest.source !== undefined) {
            data.source = ingest.source;
        }
        const metadata = this.buildDiscoveryMetadata(ingest);
        if (metadata) {
            data.metadata = metadata;
        }
        return this.streams.upsertFromDiscovery(data);
    }

    private buildDiscoveryMetadata(ingest: SyncDiscoveredStream): StreamMetadata | undefined {
        const metadata = { ...ingest.video, ...ingest.audio, ...ingest.metadata };
        return Object.keys(metadata).length > 0 ? metadata : undefined;
    }
}
