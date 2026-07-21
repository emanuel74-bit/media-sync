import { Injectable } from "@nestjs/common";

import { PodRole } from "@/common";
import { PodQueryService } from "@/pods";
import { StreamsFacadeService } from "@/streams";
import { MediaMtxStreamListingService } from "@/media-nodes";

import { SyncContext } from "../../domain";

@Injectable()
export class SyncContextBuilderService {
    constructor(
        private readonly mediaMtxQuery: MediaMtxStreamListingService,
        private readonly streams: StreamsFacadeService,
        private readonly podsService: PodQueryService,
    ) {}

    async buildContext(): Promise<SyncContext> {
        const [ingestStreams, clusterStreams, podIds, allStreams] = await Promise.all([
            this.mediaMtxQuery.listStreams(PodRole.INGEST),
            this.mediaMtxQuery.listStreams(PodRole.CLUSTER),
            this.podsService.listActivePodIds(PodRole.CLUSTER),
            this.streams.findAll(),
        ]);

        // Carry each ingest stream's owning node forward so the relay pulls from that
        // specific ingest node (multi-ingest per-node origin).
        const ingestList = ingestStreams.map(({ stream, nodeId }) => ({
            name: stream.name,
            source: stream.source,
            status: stream.status,
            ingestPod: nodeId ?? undefined,
        }));
        const clusterList = clusterStreams.map(({ stream }) => stream);

        return {
            ingestList,
            clusterList,
            ingestNames: new Set(ingestList.map((stream) => stream.name)),
            clusterNames: new Set(clusterList.map((stream) => stream.name)),
            podIds,
            allStreams,
        };
    }
}
