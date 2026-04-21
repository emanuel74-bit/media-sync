import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { SYNC_WORKFLOWS } from "../../domain";
import { SyncWorkflow, SyncContext } from "../../domain";
import { SystemEventNames } from "../../../common/events";
import { SyncOrchestratorService } from "./sync-orchestrator.service";

const makeContext = (podIds: string[] = ["pod-1"]): SyncContext => ({
    podIds,
    ingestList: [{ name: "s1", source: "rtsp://a", status: "ready" }],
    clusterList: [{ name: "s1", source: "rtsp://b", status: "ready" }],
    ingestNames: new Set(["s1"]),
    clusterNames: new Set(["s1"]),
    allStreams: [],
});

const makeWorkflow = (): jest.Mocked<SyncWorkflow> => ({
    execute: jest.fn().mockResolvedValue(undefined),
});

describe("SyncOrchestratorService", () => {
    let service: SyncOrchestratorService;
    let events: jest.Mocked<EventEmitter2>;
    let workflow1: jest.Mocked<SyncWorkflow>;
    let workflow2: jest.Mocked<SyncWorkflow>;

    const buildModule = async (workflows: SyncWorkflow[]) => {
        events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SyncOrchestratorService,
                { provide: EventEmitter2, useValue: events },
                { provide: SYNC_WORKFLOWS, useValue: workflows },
            ],
        }).compile();

        service = module.get<SyncOrchestratorService>(SyncOrchestratorService);
    };

    describe("execute — with active pods", () => {
        beforeEach(async () => {
            workflow1 = makeWorkflow();
            workflow2 = makeWorkflow();
            await buildModule([workflow1, workflow2]);
        });

        it("runs all registered workflows in order", async () => {
            const executionOrder: number[] = [];
            workflow1.execute.mockImplementation(async () => {
                executionOrder.push(1);
            });
            workflow2.execute.mockImplementation(async () => {
                executionOrder.push(2);
            });

            await service.execute(makeContext());

            expect(executionOrder).toEqual([1, 2]);
        });

        it("passes the context to each workflow", async () => {
            const ctx = makeContext();
            await service.execute(ctx);

            expect(workflow1.execute).toHaveBeenCalledWith(ctx);
            expect(workflow2.execute).toHaveBeenCalledWith(ctx);
        });

        it("emits SYNC_TICK with ingest and cluster counts after workflows complete", async () => {
            await service.execute(makeContext());

            expect(events.emit).toHaveBeenCalledWith(SystemEventNames.SYNC_TICK, {
                ingest: 1,
                cluster: 1,
            });
        });
    });

    describe("execute — no active pods", () => {
        beforeEach(async () => {
            workflow1 = makeWorkflow();
            await buildModule([workflow1]);
        });

        it("skips all workflows when podIds is empty", async () => {
            await service.execute(makeContext([]));
            expect(workflow1.execute).not.toHaveBeenCalled();
        });

        it("does not emit SYNC_TICK when podIds is empty", async () => {
            await service.execute(makeContext([]));
            expect(events.emit).not.toHaveBeenCalled();
        });
    });

    describe("execute — no registered workflows", () => {
        beforeEach(async () => {
            await buildModule([]);
        });

        it("emits SYNC_TICK even with zero workflows", async () => {
            await service.execute(makeContext());
            expect(events.emit).toHaveBeenCalledWith(
                SystemEventNames.SYNC_TICK,
                expect.any(Object),
            );
        });
    });
});
