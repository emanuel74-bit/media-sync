import { NodeRole } from "@/common";
import { NodeQueryService } from "@/nodes";
import { NodeResolver, MediaMtxMetricsService } from "@/media-nodes/services";

const snapshot = (node: string, paths: number, context = NodeRole.INGEST) =>
    ({ node: { node, context, paths } }) as never;

describe("MediaMtxMetricsService.getNodeLoads", () => {
    let service: MediaMtxMetricsService;
    let nodes: jest.Mocked<NodeResolver>;
    let nodeQuery: jest.Mocked<NodeQueryService>;

    beforeEach(() => {
        nodes = {} as unknown as jest.Mocked<NodeResolver>;
        nodeQuery = { listActiveNodeIds: jest.fn() } as unknown as jest.Mocked<NodeQueryService>;
        service = new MediaMtxMetricsService(nodes, nodeQuery);
    });

    it("reports each active node's live path count, filling absent nodes with zero", async () => {
        nodeQuery.listActiveNodeIds.mockResolvedValue(["a", "b"]);
        jest.spyOn(service, "collect").mockResolvedValue([snapshot("a", 3)]);

        const loads = await service.getNodeLoads(NodeRole.INGEST);

        expect(loads).toEqual([
            { nodeId: "a", load: 3 },
            { nodeId: "b", load: 0 },
        ]);
        expect(nodeQuery.listActiveNodeIds).toHaveBeenCalledWith(NodeRole.INGEST);
    });

    it("ignores snapshots from a different role", async () => {
        nodeQuery.listActiveNodeIds.mockResolvedValue(["a"]);
        jest.spyOn(service, "collect").mockResolvedValue([snapshot("a", 5, NodeRole.CLUSTER)]);

        const loads = await service.getNodeLoads(NodeRole.INGEST);

        expect(loads).toEqual([{ nodeId: "a", load: 0 }]);
    });

    it("returns empty when no nodes of the role are active", async () => {
        nodeQuery.listActiveNodeIds.mockResolvedValue([]);
        jest.spyOn(service, "collect").mockResolvedValue([]);

        expect(await service.getNodeLoads(NodeRole.INGEST)).toEqual([]);
    });
});
