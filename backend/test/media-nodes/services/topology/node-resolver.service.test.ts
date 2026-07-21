import { Test, TestingModule } from "@nestjs/testing";

import { PodRole } from "@/common";
import { PodQueryService } from "@/pods";
import { NodeResolver } from "@/media-nodes/services";
import { MediaMtxClientRegistry } from "@/infrastructure";

describe("NodeResolver — per-node port resolution", () => {
    let resolver: NodeResolver;
    let pods: jest.Mocked<PodQueryService>;
    let registry: jest.Mocked<MediaMtxClientRegistry>;

    beforeEach(async () => {
        pods = { listActivePodRefs: jest.fn() } as unknown as jest.Mocked<PodQueryService>;
        registry = {
            getClient: jest.fn().mockReturnValue({}),
            getMetricsClient: jest.fn().mockReturnValue({}),
        } as unknown as jest.Mocked<MediaMtxClientRegistry>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NodeResolver,
                { provide: PodQueryService, useValue: pods },
                { provide: MediaMtxClientRegistry, useValue: registry },
            ],
        }).compile();

        resolver = module.get(NodeResolver);
    });

    it("uses a pod's self-reported api port (several nodes per VM share a host)", async () => {
        pods.listActivePodRefs.mockResolvedValue([
            {
                podId: "a",
                host: "10.0.3.10",
                apiPort: 9001,
                rtspPort: 8554,
                metricsPort: 9998,
                type: PodRole.CLUSTER,
            },
        ]);

        await resolver.clientForPod(PodRole.CLUSTER, "a");

        expect(registry.getClient).toHaveBeenCalledWith("10.0.3.10", 9001, PodRole.CLUSTER);
    });

    it("scrapes each node on its reported metrics port", async () => {
        pods.listActivePodRefs.mockResolvedValue([
            {
                podId: "a",
                host: "10.0.3.10",
                apiPort: 9000,
                rtspPort: 8554,
                metricsPort: 9999,
                type: PodRole.INGEST,
            },
            {
                podId: "b",
                host: "10.0.3.11",
                apiPort: 9000,
                rtspPort: 8554,
                metricsPort: 9998,
                type: PodRole.INGEST,
            },
        ]);

        await resolver.getMetricsTargets(PodRole.INGEST);

        expect(registry.getMetricsClient).toHaveBeenCalledWith("10.0.3.10", 9999, PodRole.INGEST);
        expect(registry.getMetricsClient).toHaveBeenCalledWith("10.0.3.11", 9998, PodRole.INGEST);
    });

    it("builds an ingest node's RTSP url from its host + reported rtsp port", async () => {
        pods.listActivePodRefs.mockResolvedValue([
            {
                podId: "ingest-1",
                host: "10.0.3.10",
                apiPort: 9000,
                rtspPort: 8555,
                metricsPort: 9998,
                type: PodRole.INGEST,
            },
        ]);

        const url = await resolver.getIngestRtspUrl("ingest-1", "live");

        expect(url).toBe("rtsp://10.0.3.10:8555/live");
    });

    it("throws when the ingest node for a stream is not live", async () => {
        pods.listActivePodRefs.mockResolvedValue([]);

        await expect(resolver.getIngestRtspUrl("ingest-gone", "live")).rejects.toThrow(
            "No active ingest node for pod ingest-gone",
        );
    });
});
