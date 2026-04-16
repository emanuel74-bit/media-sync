import { Injectable } from "@nestjs/common";

import { PodRole } from "../../../common";
import { SyncContext } from "../../domain";
import { PodQueryService } from "../../../pods/services";
import { StreamQueryService } from "../../../streams/services/query";
import { MediaMtxStreamListingService } from "../../../infrastructure/media-mtx/services";

@Injectable()
export class SyncQueryAggregatorService {
    constructor(
        private readonly mediaMtxQuery: MediaMtxStreamListingService,
        private readonly streamQuery: StreamQueryService,
        private readonly podsService: PodQueryService,
    ) {}

    async buildContext(): Promise<SyncContext> {
        const [ingestList, clusterList, podIds, allStreams] = await Promise.all([
            this.mediaMtxQuery.listIngestStreams(),
            this.mediaMtxQuery.listClusterStreams(),
            this.podsService.listActivePodIds(PodRole.CLUSTER),
            this.streamQuery.findAll(),
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
