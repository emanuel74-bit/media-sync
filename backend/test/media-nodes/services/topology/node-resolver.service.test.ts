import { Test, TestingModule } from "@nestjs/testing";

import { NodeRole } from "@/common";
import { NodeQueryService } from "@/nodes";
import { NodeResolver } from "@/media-nodes/services";
import { MediaMtxClientRegistry } from "@/infrastructure";

describe("NodeResolver — per-node port resolution", () => {
    let resolver: NodeResolver;
    let nodes: jest.Mocked<NodeQueryService>;
    let registry: jest.Mocked<MediaMtxClientRegistry>;

    beforeEach(async () => {
        nodes = { listActiveNodeRefs: jest.fn() } as unknown as jest.Mocked<NodeQueryService>;
        registry = {
            getClient: jest.fn().mockReturnValue({}),
            getMetricsClient: jest.fn().mockReturnValue({}),
        } as unknown as jest.Mocked<MediaMtxClientRegistry>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NodeResolver,
                { provide: NodeQueryService, useValue: nodes },
                { provide: MediaMtxClientRegistry, useValue: registry },
            ],
        }).compile();

        resolver = module.get(NodeResolver);
    });

    it("uses a node's self-reported api port (several nodes per VM share a host)", async () => {
        nodes.listActiveNodeRefs.mockResolvedValue([
            {
                nodeId: "a",
                host: "10.0.3.10",
                apiPort: 9001,
                rtspPort: 8554,
                metricsPort: 9998,
                type: NodeRole.CLUSTER,
            },
        ]);

        await resolver.clientForNode(NodeRole.CLUSTER, "a");

        expect(registry.getClient).toHaveBeenCalledWith("10.0.3.10", 9001, NodeRole.CLUSTER);
    });

    it("scrapes each node on its reported metrics port", async () => {
        nodes.listActiveNodeRefs.mockResolvedValue([
            {
                nodeId: "a",
                host: "10.0.3.10",
                apiPort: 9000,
                rtspPort: 8554,
                metricsPort: 9999,
                type: NodeRole.INGEST,
            },
            {
                nodeId: "b",
                host: "10.0.3.11",
                apiPort: 9000,
                rtspPort: 8554,
                metricsPort: 9998,
                type: NodeRole.INGEST,
            },
        ]);

        await resolver.getMetricsTargets(NodeRole.INGEST);

        expect(registry.getMetricsClient).toHaveBeenCalledWith("10.0.3.10", 9999, NodeRole.INGEST);
        expect(registry.getMetricsClient).toHaveBeenCalledWith("10.0.3.11", 9998, NodeRole.INGEST);
    });

    it("builds an ingest node's RTSP url from its host + reported rtsp port", async () => {
        nodes.listActiveNodeRefs.mockResolvedValue([
            {
                nodeId: "ingest-1",
                host: "10.0.3.10",
                apiPort: 9000,
                rtspPort: 8555,
                metricsPort: 9998,
                type: NodeRole.INGEST,
            },
        ]);

        const url = await resolver.getIngestRtspUrl("ingest-1", "live");

        expect(url).toBe("rtsp://10.0.3.10:8555/live");
    });

    it("throws when the ingest node for a stream is not live", async () => {
        nodes.listActiveNodeRefs.mockResolvedValue([]);

        await expect(resolver.getIngestRtspUrl("ingest-gone", "live")).rejects.toThrow(
            "No active ingest node for node ingest-gone",
        );
    });
});
