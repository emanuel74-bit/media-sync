import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { SystemEventNames } from "@/common";
import { SyncContext } from "@/sync/domain";
import {
    SyncOrchestratorService,
    StreamReconcileService,
    StreamStalenessService,
    IngestStreamSynchronizerService,
} from "@/sync/services";

const makeContext = (nodeIds: string[] = ["node-1"]): SyncContext => ({
    nodeIds,
    ingestList: [{ name: "s1", source: "rtsp://a", status: "ready" }],
    clusterList: [{ name: "s1", source: "rtsp://b", status: "ready" }],
    ingestNames: new Set(["s1"]),
    clusterNames: new Set(["s1"]),
    ingestNodeIds: new Set(["ingest-1"]),
    observedIngestNodeIds: new Set(["ingest-1"]),
    allStreams: [],
});

describe("SyncOrchestratorService", () => {
    let service: SyncOrchestratorService;
    let events: jest.Mocked<EventEmitter2>;
    let ingestSync: { execute: jest.Mock };
    let reconcile: { execute: jest.Mock };
    let staleness: { execute: jest.Mock };

    beforeEach(async () => {
        events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;
        ingestSync = { execute: jest.fn().mockResolvedValue(undefined) };
        reconcile = { execute: jest.fn().mockResolvedValue(undefined) };
        staleness = { execute: jest.fn().mockResolvedValue(undefined) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SyncOrchestratorService,
                { provide: EventEmitter2, useValue: events },
                { provide: IngestStreamSynchronizerService, useValue: ingestSync },
                { provide: StreamReconcileService, useValue: reconcile },
                { provide: StreamStalenessService, useValue: staleness },
            ],
        }).compile();

        service = module.get<SyncOrchestratorService>(SyncOrchestratorService);
    });

    describe("execute — with active nodes", () => {
        it("runs the workflow steps in order", async () => {
            const executionOrder: string[] = [];
            ingestSync.execute.mockImplementation(async () => {
                executionOrder.push("ingest");
            });
            reconcile.execute.mockImplementation(async () => {
                executionOrder.push("reconcile");
            });
            staleness.execute.mockImplementation(async () => {
                executionOrder.push("staleness");
            });

            await service.execute(makeContext());

            expect(executionOrder).toEqual(["ingest", "reconcile", "staleness"]);
        });

        it("passes the context to each step", async () => {
            const ctx = makeContext();
            await service.execute(ctx);

            expect(ingestSync.execute).toHaveBeenCalledWith(ctx);
            expect(reconcile.execute).toHaveBeenCalledWith(ctx);
            expect(staleness.execute).toHaveBeenCalledWith(ctx);
        });

        it("emits SYNC_TICK with ingest and cluster counts after the steps complete", async () => {
            await service.execute(makeContext());

            expect(events.emit).toHaveBeenCalledWith(SystemEventNames.SYNC_TICK, {
                ingest: 1,
                cluster: 1,
                failures: [],
            });
        });

        it("isolates a failing step, continues, and reports it by name in SYNC_TICK", async () => {
            reconcile.execute.mockRejectedValue(new Error("boom"));

            await service.execute(makeContext());

            expect(staleness.execute).toHaveBeenCalledTimes(1);
            expect(events.emit).toHaveBeenCalledWith(SystemEventNames.SYNC_TICK, {
                ingest: 1,
                cluster: 1,
                failures: ["Reconcile"],
            });
        });
    });

    describe("execute — no active nodes", () => {
        it("skips assignment but still runs cleanup when nodeIds is empty", async () => {
            await service.execute(makeContext([]));

            expect(ingestSync.execute).not.toHaveBeenCalled();
            expect(reconcile.execute).not.toHaveBeenCalled();
            expect(staleness.execute).toHaveBeenCalledTimes(1);
        });

        it("still emits SYNC_TICK when nodeIds is empty", async () => {
            await service.execute(makeContext([]));
            expect(events.emit).toHaveBeenCalledWith(SystemEventNames.SYNC_TICK, {
                ingest: 1,
                cluster: 1,
                failures: [],
            });
        });
    });
});
