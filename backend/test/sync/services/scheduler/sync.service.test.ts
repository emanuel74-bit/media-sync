import { Test, TestingModule } from "@nestjs/testing";

import { SyncContext } from "@/sync/domain";
import { SequentialStreamTaskRunner } from "@/common";
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
    let scheduledWork: jest.Mocked<SequentialStreamTaskRunner>;

    beforeEach(async () => {
        queryAggregator = {
            buildContext: jest.fn(),
        } as unknown as jest.Mocked<SyncQueryAggregatorService>;

        orchestrator = {
            execute: jest.fn(),
        } as unknown as jest.Mocked<SyncOrchestratorService>;

        scheduledWork = {
            runSafely: jest.fn(),
        } as unknown as jest.Mocked<SequentialStreamTaskRunner>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SyncService,
                { provide: SyncQueryAggregatorService, useValue: queryAggregator },
                { provide: SyncOrchestratorService, useValue: orchestrator },
                { provide: SequentialStreamTaskRunner, useValue: scheduledWork },
            ],
        }).compile();

        service = module.get<SyncService>(SyncService);
    });

    it("runs the periodic sync inside SequentialStreamTaskRunner.runSafely", async () => {
        scheduledWork.runSafely.mockResolvedValue(undefined);

        await service.periodicSync();

        expect(scheduledWork.runSafely).toHaveBeenCalledWith(
            expect.any(Function),
            expect.any(Function),
        );
    });

    it("builds context and delegates execution when the scheduled work callback runs", async () => {
        const context = makeContext();
        queryAggregator.buildContext.mockResolvedValue(context);
        orchestrator.execute.mockResolvedValue(undefined);
        scheduledWork.runSafely.mockImplementation(async (work) => {
            await work();
        });

        await service.periodicSync();

        expect(queryAggregator.buildContext).toHaveBeenCalledTimes(1);
        expect(orchestrator.execute).toHaveBeenCalledWith(context);
    });

    it("logs through the scheduled error callback when the protected work fails", async () => {
        const error = new Error("periodic sync failed");
        const errorSpy = jest.spyOn((service as any).logger, "error").mockImplementation();
        scheduledWork.runSafely.mockImplementation(async (_work, onError) => {
            onError(error);
        });

        await service.periodicSync();

        expect(errorSpy).toHaveBeenCalledWith("Periodic sync failed", error);
        expect(queryAggregator.buildContext).not.toHaveBeenCalled();
    });
});
