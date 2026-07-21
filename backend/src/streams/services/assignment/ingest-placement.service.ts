import { Injectable, ServiceUnavailableException } from "@nestjs/common";

import { NodeRole, selectLeastLoaded } from "@/common";
import { MediaMtxMetricsService } from "@/media-nodes";

import { StreamQueryService } from "../query";

/**
 * Chooses which ingest node a new publish reservation lands on: the least-loaded, where load is
 * a node's live publishers (metrics tier) plus the reservations already pending on it, so
 * consecutive reserves spread out. Selection only — the chosen node is persisted by the
 * reservation insert (`StreamSetupService`), not here (unlike cluster assignment, this is a
 * birth-time input, not a mutation).
 */
@Injectable()
export class IngestPlacementService {
    constructor(
        private readonly metrics: MediaMtxMetricsService,
        private readonly streamQuery: StreamQueryService,
    ) {}

    async selectNode(): Promise<string> {
        const [loads, reservations] = await Promise.all([
            this.metrics.getNodeLoads(NodeRole.INGEST),
            this.streamQuery.countReservationsByIngestNode(),
        ]);
        if (!loads.length) {
            throw new ServiceUnavailableException("No active ingest nodes available");
        }

        const candidates = loads.map(({ nodeId, load }) => ({
            id: nodeId,
            load: load + (reservations[nodeId] ?? 0),
        }));
        return selectLeastLoaded(candidates);
    }
}
