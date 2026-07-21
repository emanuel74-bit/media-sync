import { Test, TestingModule } from "@nestjs/testing";
import { ServiceUnavailableException } from "@nestjs/common";

import { PodRole } from "@/common";
import { MediaMtxMetricsService } from "@/media-nodes";
import { IngestPlacementService, StreamQueryService } from "@/streams/services";

describe("IngestPlacementService", () => {
    let service: IngestPlacementService;
    let metrics: jest.Mocked<MediaMtxMetricsService>;
    let streamQuery: jest.Mocked<StreamQueryService>;

    beforeEach(async () => {
        metrics = {
            getNodeLoads: jest.fn().mockResolvedValue([]),
        } as unknown as jest.Mocked<MediaMtxMetricsService>;
        streamQuery = {
            countReservationsByIngestPod: jest.fn().mockResolvedValue({}),
        } as unknown as jest.Mocked<StreamQueryService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IngestPlacementService,
                { provide: MediaMtxMetricsService, useValue: metrics },
                { provide: StreamQueryService, useValue: streamQuery },
            ],
        }).compile();

        service = module.get(IngestPlacementService);
    });

    it("throws when no ingest nodes are active", async () => {
        metrics.getNodeLoads.mockResolvedValue([]);

        await expect(service.selectNode()).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it("picks the least-loaded node, folding live load and pending reservations", async () => {
        metrics.getNodeLoads.mockResolvedValue([
            { podId: "ingest-a", load: 1 },
            { podId: "ingest-b", load: 1 },
        ]);
        streamQuery.countReservationsByIngestPod.mockResolvedValue({ "ingest-a": 2 });

        // a: 1 live + 2 reserved = 3; b: 1 live + 0 = 1 → b wins
        expect(await service.selectNode()).toBe("ingest-b");
        expect(metrics.getNodeLoads).toHaveBeenCalledWith(PodRole.INGEST);
    });

    it("breaks ties on load by pod id for determinism", async () => {
        metrics.getNodeLoads.mockResolvedValue([
            { podId: "ingest-b", load: 0 },
            { podId: "ingest-a", load: 0 },
        ]);

        expect(await service.selectNode()).toBe("ingest-a");
    });
});
