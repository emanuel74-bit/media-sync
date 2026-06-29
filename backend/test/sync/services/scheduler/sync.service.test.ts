import { Test, TestingModule } from "@nestjs/testing";

import { SyncContext } from "@/sync/domain";
import { SyncOrchestratorService, SyncQueryAggregatorService, SyncService } from "@/sync/services";

const makeContext = (overrides: Partial<SyncContext> = {}): SyncContext => ({
    ingestList: [{ name: "s1", source: "rtsp://ingest", status: "ready" }],
    clusterList: [{ name: "s1", source: "rtsp://cluster", status: "ready" }],
    ingestNames: new Set(["s1"]),
    clusterNames: new Set(["s1"]),
    podIds: ["pod-1"],
    allStreams: [],
    ...overrides,
});

describe("SyncService", () => {
    let service: SyncService;
    let queryAggregator: jest.Mocked<SyncQueryAggregatorService>;
    let orchestrator: jest.Mocked<SyncOrchestratorService>;

    beforeEach(async () => {
        queryAggregator = {
            buildContext: jest.fn(),
        } as unknown as jest.Mocked<SyncQueryAggregatorService>;

        orchestrator = {
            execute: jest.fn(),
        } as unknown as jest.Mocked<SyncOrchestratorService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SyncService,
                { provide: SyncQueryAggregatorService, useValue: queryAggregator },
                { provide: SyncOrchestratorService, useValue: orchestrator },
            ],
        }).compile();

        service = module.get<SyncService>(SyncService);
    });

    it("builds context and delegates execution", async () => {
        const context = makeContext();
        queryAggregator.buildContext.mockResolvedValue(context);
        orchestrator.execute.mockResolvedValue(undefined);

        await service.periodicSync();

        expect(queryAggregator.buildContext).toHaveBeenCalledTimes(1);
        expect(orchestrator.execute).toHaveBeenCalledWith(context);
    });

    it("propagates a failing cycle (the scheduler guards it) without executing", async () => {
        const error = new Error("periodic sync failed");
        queryAggregator.buildContext.mockRejectedValue(error);

        await expect(service.periodicSync()).rejects.toThrow("periodic sync failed");

        expect(orchestrator.execute).not.toHaveBeenCalled();
    });
});
