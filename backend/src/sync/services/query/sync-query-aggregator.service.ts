import { Injectable } from "@nestjs/common";

import { PodRole } from "@/common";
import { MediaMtxStreamListingService } from "@/media-mtx";
import { PodQueryService } from "@/pods";
import { StreamsFacadeService } from "@/streams";

import { SyncContext } from "../../domain/types/sync-context.types";

@Injectable()
export class SyncQueryAggregatorService {
    constructor(
        private readonly mediaMtxQuery: MediaMtxStreamListingService,
        private readonly streams: StreamsFacadeService,
        private readonly podsService: PodQueryService,
    ) {}

    async buildContext(): Promise<SyncContext> {
        const [ingestList, clusterList, podIds, allStreams] = await Promise.all([
            this.mediaMtxQuery.listIngestStreams(),
            this.mediaMtxQuery.listClusterStreams(),
            this.podsService.listActivePodIds(PodRole.CLUSTER),
            this.streams.findAll(),
        ]);

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
