import { Test, TestingModule } from "@nestjs/testing";

import { SyncContext } from "@/sync/domain";
import {
    SyncContextBuilderService,
    SyncOrchestratorService,
    SyncSchedulerService,
} from "@/sync/services";

const makeContext = (overrides: Partial<SyncContext> = {}): SyncContext => ({
    ingestList: [{ name: "s1", source: "rtsp://ingest", status: "ready" }],
    clusterList: [{ name: "s1", source: "rtsp://cluster", status: "ready" }],
    ingestNames: new Set(["s1"]),
    clusterNames: new Set(["s1"]),
    ingestNodeIds: new Set(["ingest-1"]),
    observedIngestNodeIds: new Set(["ingest-1"]),
    nodeIds: ["node-1"],
    allStreams: [],
    ...overrides,
});

describe("SyncSchedulerService", () => {
    let service: SyncSchedulerService;
    let contextBuilder: jest.Mocked<SyncContextBuilderService>;
    let orchestrator: jest.Mocked<SyncOrchestratorService>;

    beforeEach(async () => {
        contextBuilder = {
            buildContext: jest.fn(),
        } as unknown as jest.Mocked<SyncContextBuilderService>;

        orchestrator = {
            execute: jest.fn(),
        } as unknown as jest.Mocked<SyncOrchestratorService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SyncSchedulerService,
                { provide: SyncContextBuilderService, useValue: contextBuilder },
                { provide: SyncOrchestratorService, useValue: orchestrator },
            ],
        }).compile();

        service = module.get<SyncSchedulerService>(SyncSchedulerService);
    });

    it("builds context and delegates execution", async () => {
        const context = makeContext();
        contextBuilder.buildContext.mockResolvedValue(context);
        orchestrator.execute.mockResolvedValue(undefined);

        await service.periodicSync();

        expect(contextBuilder.buildContext).toHaveBeenCalledTimes(1);
        expect(orchestrator.execute).toHaveBeenCalledWith(context);
    });

    it("propagates a failing cycle without executing", async () => {
        contextBuilder.buildContext.mockRejectedValue(new Error("periodic sync failed"));

        await expect(service.periodicSync()).rejects.toThrow("periodic sync failed");

        expect(orchestrator.execute).not.toHaveBeenCalled();
    });
});
