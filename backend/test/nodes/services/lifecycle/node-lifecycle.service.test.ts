import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { Node } from "@/nodes/domain";
import { ConfigService } from "@/config";
import { SystemEventNames } from "@/common";
import { NodeRole, NodeStatus } from "@/common";
import { NodeRepository } from "@/nodes/repositories";
import { NodeLifecycleService } from "@/nodes/services";

const makeNode = (overrides: Partial<Node> = {}): Node => ({
    nodeId: "node-1",
    status: NodeStatus.ACTIVE,
    lastHeartbeatAt: new Date(),
    host: "10.0.0.1",
    apiPort: 9000,
    rtspPort: 8554,
    metricsPort: 9998,
    type: NodeRole.CLUSTER,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe("NodeLifecycleService", () => {
    let service: NodeLifecycleService;
    let nodeRepository: jest.Mocked<NodeRepository>;
    let events: jest.Mocked<EventEmitter2>;

    beforeEach(async () => {
        nodeRepository = {
            upsertByNodeId: jest.fn(),
            findAll: jest.fn(),
            findActive: jest.fn(),
        } as unknown as jest.Mocked<NodeRepository>;

        events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

        const config = {
            ingestNodeMediaMtxPort: 9000,
            clusterNodeMediaMtxPort: 9000,
            mediaMtxRtspPort: 8554,
            mediaMtxMetricsPort: 9998,
        } as unknown as ConfigService;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NodeLifecycleService,
                { provide: NodeRepository, useValue: nodeRepository },
                { provide: ConfigService, useValue: config },
                { provide: EventEmitter2, useValue: events },
            ],
        }).compile();

        service = module.get<NodeLifecycleService>(NodeLifecycleService);
    });

    describe("registerNode", () => {
        it("upserts the node with ACTIVE status, host, and type and emits NODE_REGISTERED", async () => {
            const node = makeNode();
            nodeRepository.upsertByNodeId.mockResolvedValue(node);

            const result = await service.registerNode({
                nodeId: "node-1",
                host: "10.0.0.2",
                type: NodeRole.INGEST,
            });

            expect(nodeRepository.upsertByNodeId).toHaveBeenCalledWith(
                "node-1",
                expect.objectContaining({
                    status: NodeStatus.ACTIVE,
                    lastHeartbeatAt: expect.any(Date),
                    host: "10.0.0.2",
                    type: NodeRole.INGEST,
                }),
            );
            expect(result).toBe(node);
            expect(events.emit).toHaveBeenCalledWith(SystemEventNames.NODE_REGISTERED, node);
        });

        it("persists self-reported ports when present", async () => {
            nodeRepository.upsertByNodeId.mockResolvedValue(makeNode());

            await service.registerNode({
                nodeId: "node-1",
                host: "10.0.3.10",
                apiPort: 9001,
                rtspPort: 8555,
                metricsPort: 9999,
                type: NodeRole.INGEST,
            });

            const [, fields] = nodeRepository.upsertByNodeId.mock.calls[0];
            expect(fields).toMatchObject({ apiPort: 9001, rtspPort: 8555, metricsPort: 9999 });
        });

        it("defaults ports from config when the node does not report them", async () => {
            nodeRepository.upsertByNodeId.mockResolvedValue(makeNode());

            await service.registerNode({
                nodeId: "node-1",
                host: "10.0.0.1",
                type: NodeRole.CLUSTER,
            });

            const [, fields] = nodeRepository.upsertByNodeId.mock.calls[0];
            expect(fields).toMatchObject({ apiPort: 9000, rtspPort: 8554, metricsPort: 9998 });
        });

        it("updates lastHeartbeatAt with a recent timestamp", async () => {
            const before = new Date();
            nodeRepository.upsertByNodeId.mockResolvedValue(makeNode());

            await service.registerNode({
                nodeId: "node-1",
                host: "10.0.0.1",
                type: NodeRole.CLUSTER,
            });

            const [, fields] = nodeRepository.upsertByNodeId.mock.calls[0];
            expect(fields.lastHeartbeatAt).toBeInstanceOf(Date);
            expect((fields.lastHeartbeatAt as Date).getTime()).toBeGreaterThanOrEqual(
                before.getTime(),
            );
        });
    });

    describe("heartbeat", () => {
        it("upserts the node with ACTIVE status and current timestamp", async () => {
            const node = makeNode();
            nodeRepository.upsertByNodeId.mockResolvedValue(node);

            const result = await service.heartbeat({ nodeId: "node-1" });

            expect(nodeRepository.upsertByNodeId).toHaveBeenCalledWith(
                "node-1",
                expect.objectContaining({ status: NodeStatus.ACTIVE }),
            );
            expect(result).toBe(node);
        });

        it("does not emit an event when no resources are reported", async () => {
            nodeRepository.upsertByNodeId.mockResolvedValue(makeNode());

            await service.heartbeat({ nodeId: "node-1" });

            expect(events.emit).not.toHaveBeenCalled();
        });

        it("emits node.sampled when the heartbeat carries host resources", async () => {
            nodeRepository.upsertByNodeId.mockResolvedValue(makeNode());

            await service.heartbeat({
                nodeId: "node-1",
                resources: { cpu: 92, memory: 40, disk: 30 },
            });

            expect(events.emit).toHaveBeenCalledWith(
                SystemEventNames.NODE_SAMPLED,
                expect.objectContaining({ nodeId: "node-1", cpu: 92 }),
            );
        });
    });
});
