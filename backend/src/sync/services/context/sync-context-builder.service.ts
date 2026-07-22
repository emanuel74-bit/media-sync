import { Injectable } from "@nestjs/common";

import { NodeRole } from "@/common";
import { NodeQueryService } from "@/nodes";
import { StreamsFacadeService } from "@/streams";
import { MediaMtxStreamListingService } from "@/media-nodes";

import { SyncContext } from "../../domain";

@Injectable()
export class SyncContextBuilderService {
    constructor(
        private readonly mediaMtxQuery: MediaMtxStreamListingService,
        private readonly streams: StreamsFacadeService,
        private readonly nodesService: NodeQueryService,
    ) {}

    async buildContext(): Promise<SyncContext> {
        const [ingestStreams, clusterStreams, nodeIds, allStreams] = await Promise.all([
            this.mediaMtxQuery.listStreams(NodeRole.INGEST),
            this.mediaMtxQuery.listStreams(NodeRole.CLUSTER),
            this.nodesService.listActiveNodeIds(NodeRole.CLUSTER),
            this.streams.findAll(),
        ]);

        // Carry each ingest stream's owning node forward so the relay pulls from that
        // specific ingest node (multi-ingest per-node origin).
        const ingestList = ingestStreams.streams.map(({ stream, nodeId }) => ({
            name: stream.name,
            source: stream.source,
            status: stream.status,
            ingestNode: nodeId ?? undefined,
        }));
        const clusterList = clusterStreams.streams.map(({ stream }) => stream);

        return {
            ingestList,
            clusterList,
            ingestNames: new Set(ingestList.map((stream) => stream.name)),
            clusterNames: new Set(clusterList.map((stream) => stream.name)),
            ingestNodeIds: new Set(ingestStreams.nodeIds),
            observedIngestNodeIds: new Set(ingestStreams.observedNodeIds),
            nodeIds,
            allStreams,
        };
    }
}
