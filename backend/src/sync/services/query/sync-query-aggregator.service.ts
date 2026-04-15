import { Injectable } from "@nestjs/common";

import { PodRole } from "../../../common";
import { SyncContext } from "../../domain";
import { PodsService } from "../../../pods/services";
import { StreamQueryService } from "../../../streams/services/query";
import { MediaMtxStreamListingService } from "../../../infrastructure/media-mtx/services";

@Injectable()
export class SyncQueryAggregatorService {
    constructor(
        private readonly mediaMtxQuery: MediaMtxStreamListingService,
        private readonly streamQuery: StreamQueryService,
        private readonly podsService: PodsService,
    ) {}

    async buildContext(): Promise<SyncContext> {
        const [ingestList, clusterList] = await Promise.all([
            this.mediaMtxQuery.listIngestStreams(),
            this.mediaMtxQuery.listClusterStreams(),
        ]);

        const podIds = await this.podsService.listActivePodIds(PodRole.CLUSTER);

        return {
            ingestList,
            clusterList,
            ingestNames: new Set(ingestList.map((stream) => stream.name)),
            clusterNames: new Set(clusterList.map((stream) => stream.name)),
            podIds,
        };
    }

    async withAllStreams(context: SyncContext): Promise<SyncContext> {
        return {
            ...context,
            allStreams: await this.streamQuery.findAll(),
        };
    }
}
