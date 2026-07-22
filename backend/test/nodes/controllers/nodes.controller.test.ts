import { Test, TestingModule } from "@nestjs/testing";

import { Node } from "@/nodes/domain";
import { NodeRole, NodeStatus } from "@/common";
import { NodesController } from "@/nodes/controllers";
import { NodeQueryService, NodeLifecycleService } from "@/nodes/services";

const makeNode = (overrides: Partial<Node> = {}): Node => ({
    nodeId: "node-1",
    host: "10.0.0.1",
    apiPort: 9000,
    rtspPort: 8554,
    metricsPort: 9998,
    type: NodeRole.CLUSTER,
    status: NodeStatus.ACTIVE,
    lastHeartbeatAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe("NodesController", () => {
    let controller: NodesController;
    let nodeLifecycle: jest.Mocked<NodeLifecycleService>;
    let nodeQuery: jest.Mocked<NodeQueryService>;

    beforeEach(async () => {
        nodeLifecycle = {
            registerNode: jest.fn(),
            heartbeat: jest.fn(),
        } as unknown as jest.Mocked<NodeLifecycleService>;

        nodeQuery = {
            listNodes: jest.fn(),
            getActiveNodes: jest.fn(),
        } as unknown as jest.Mocked<NodeQueryService>;

        const module: TestingModule = await Test.createTestingModule({
            controllers: [NodesController],
            providers: [
                { provide: NodeLifecycleService, useValue: nodeLifecycle },
                { provide: NodeQueryService, useValue: nodeQuery },
            ],
        }).compile();

        controller = module.get<NodesController>(NodesController);
    });

    it("delegates listNodes to NodeQueryService", async () => {
        const nodes = [makeNode()];
        nodeQuery.listNodes.mockResolvedValue(nodes);

        const result = await controller.listNodes();

        expect(result).toBe(nodes);
        expect(nodeQuery.listNodes).toHaveBeenCalledTimes(1);
    });

    it("delegates listActiveNodes to NodeQueryService", async () => {
        const nodes = [makeNode()];
        nodeQuery.getActiveNodes.mockResolvedValue(nodes);

        const result = await controller.listActiveNodes();

        expect(result).toBe(nodes);
        expect(nodeQuery.getActiveNodes).toHaveBeenCalledTimes(1);
    });

    it("passes node registration fields through to the lifecycle service unchanged", async () => {
        const node = makeNode({ host: "10.0.0.2", type: NodeRole.INGEST });
        nodeLifecycle.registerNode.mockResolvedValue(node);

        const result = await controller.registerNode({
            nodeId: "node-2",
            host: "10.0.0.2",
            type: NodeRole.INGEST,
        });

        expect(result).toBe(node);
        expect(nodeLifecycle.registerNode).toHaveBeenCalledWith({
            nodeId: "node-2",
            host: "10.0.0.2",
            type: NodeRole.INGEST,
        });
    });

    it("delegates heartbeat to the lifecycle service", async () => {
        const node = makeNode();
        nodeLifecycle.heartbeat.mockResolvedValue(node);

        const result = await controller.heartbeat({ nodeId: "node-1" });

        expect(result).toBe(node);
        expect(nodeLifecycle.heartbeat).toHaveBeenCalledWith({
            nodeId: "node-1",
            resources: undefined,
        });
    });
});
