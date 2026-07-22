import { Test, TestingModule } from "@nestjs/testing";

import { Node } from "@/nodes/domain";
import { ConfigService } from "@/config";
import { NodeRole, NodeStatus } from "@/common";
import { NodeQueryService } from "@/nodes/services";
import { NodeRepository } from "@/nodes/repositories";

const makeNode = (nodeId: string, overrides: Partial<Node> = {}): Node => ({
    nodeId,
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

describe("NodeQueryService", () => {
    let service: NodeQueryService;
    let nodeRepository: jest.Mocked<NodeRepository>;
    let config: jest.Mocked<ConfigService>;

    beforeEach(async () => {
        nodeRepository = {
            upsertByNodeId: jest.fn(),
            findAll: jest.fn(),
            findActive: jest.fn(),
        } as unknown as jest.Mocked<NodeRepository>;

        config = {
            nodeHeartbeatToleranceSeconds: 120,
        } as unknown as jest.Mocked<ConfigService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NodeQueryService,
                { provide: NodeRepository, useValue: nodeRepository },
                { provide: ConfigService, useValue: config },
            ],
        }).compile();

        service = module.get<NodeQueryService>(NodeQueryService);
    });

    describe("listNodes", () => {
        it("returns all nodes from the repository", async () => {
            const nodes = [makeNode("a"), makeNode("b")];
            nodeRepository.findAll.mockResolvedValue(nodes);

            const result = await service.listNodes();

            expect(result).toBe(nodes);
            expect(nodeRepository.findAll).toHaveBeenCalledTimes(1);
        });
    });

    describe("getActiveNodes", () => {
        it("queries findActive with a date 120s in the past", async () => {
            const nodes = [makeNode("a")];
            nodeRepository.findActive.mockResolvedValue(nodes);
            const before = Date.now();

            const result = await service.getActiveNodes();

            const after = Date.now();
            expect(result).toBe(nodes);
            const [since] = nodeRepository.findActive.mock.calls[0];
            expect(since).toBeInstanceOf(Date);
            // `since` is computed during the call, so it brackets to [before, after] - 120s.
            expect(since.getTime()).toBeGreaterThanOrEqual(before - 120 * 1000);
            expect(since.getTime()).toBeLessThanOrEqual(after - 120 * 1000);
        });

        it("forwards role filter to the repository", async () => {
            nodeRepository.findActive.mockResolvedValue([]);

            await service.getActiveNodes(NodeRole.CLUSTER);

            expect(nodeRepository.findActive).toHaveBeenCalledWith(
                expect.any(Date),
                NodeRole.CLUSTER,
            );
        });
    });

    describe("listActiveNodeRefs", () => {
        it("maps nodes to ActiveNodeRef objects", async () => {
            const nodes = [
                makeNode("node-1", { host: "10.0.0.5" }),
                makeNode("node-2", { host: "10.0.0.6" }),
            ];
            nodeRepository.findActive.mockResolvedValue(nodes);

            const refs = await service.listActiveNodeRefs();

            expect(refs).toEqual([
                {
                    nodeId: "node-1",
                    host: "10.0.0.5",
                    apiPort: 9000,
                    rtspPort: 8554,
                    metricsPort: 9998,
                    type: NodeRole.CLUSTER,
                },
                {
                    nodeId: "node-2",
                    host: "10.0.0.6",
                    apiPort: 9000,
                    rtspPort: 8554,
                    metricsPort: 9998,
                    type: NodeRole.CLUSTER,
                },
            ]);
        });

        it("carries the node's self-reported ports (several nodes per VM)", async () => {
            nodeRepository.findActive.mockResolvedValue([
                makeNode("node-1", {
                    host: "10.0.3.10",
                    apiPort: 9001,
                    rtspPort: 8555,
                    metricsPort: 9999,
                }),
            ]);

            const [ref] = await service.listActiveNodeRefs();

            expect(ref).toMatchObject({
                nodeId: "node-1",
                host: "10.0.3.10",
                apiPort: 9001,
                rtspPort: 8555,
                metricsPort: 9999,
            });
        });
    });

    describe("listActiveNodeIds", () => {
        it("returns only the nodeId strings", async () => {
            nodeRepository.findActive.mockResolvedValue([makeNode("alpha"), makeNode("beta")]);

            const ids = await service.listActiveNodeIds();

            expect(ids).toEqual(["alpha", "beta"]);
        });

        it("returns empty array when no active nodes", async () => {
            nodeRepository.findActive.mockResolvedValue([]);

            const ids = await service.listActiveNodeIds();

            expect(ids).toEqual([]);
        });
    });
});
