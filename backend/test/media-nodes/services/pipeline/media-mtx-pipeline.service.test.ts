import { Test, TestingModule } from "@nestjs/testing";

import { PodRole } from "@/common";
import { NodeResolver } from "@/media-nodes/services";
import { MediaMtxPipelineService } from "@/media-nodes";

describe("MediaMtxPipelineService", () => {
    let service: MediaMtxPipelineService;
    let clusterNodes: jest.Mocked<NodeResolver>;
    let client: { addPath: jest.Mock; removePath: jest.Mock };

    beforeEach(async () => {
        client = { addPath: jest.fn(), removePath: jest.fn() };
        clusterNodes = {
            clientForPod: jest.fn().mockResolvedValue(client),
            getActiveNodes: jest.fn().mockResolvedValue([{ podId: "cluster-1", client }]),
        } as unknown as jest.Mocked<NodeResolver>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [MediaMtxPipelineService, { provide: NodeResolver, useValue: clusterNodes }],
        }).compile();

        service = module.get(MediaMtxPipelineService);
    });

    describe("buildClusterPullPipeline", () => {
        it("creates the pipeline on the client for the assigned pod with the given source", async () => {
            client.addPath.mockResolvedValue({});

            await service.buildClusterPullPipeline(
                "live",
                "cluster-pod-2",
                "rtsp://ingest:8554/live",
            );

            expect(clusterNodes.clientForPod).toHaveBeenCalledWith(
                PodRole.CLUSTER,
                "cluster-pod-2",
            );
            expect(client.addPath).toHaveBeenCalledWith("live", "rtsp://ingest:8554/live");
        });

        it("treats a 409 as an already-existing pipeline", async () => {
            client.addPath.mockRejectedValue({ isAxiosError: true, response: { status: 409 } });

            const result = await service.buildClusterPullPipeline("live", "pod-1", "rtsp://x/live");

            expect(result).toEqual({ alreadyExists: true });
        });

        it("rethrows non-409 failures", async () => {
            client.addPath.mockRejectedValue(new Error("boom"));

            await expect(
                service.buildClusterPullPipeline("live", "pod-1", "rtsp://x/live"),
            ).rejects.toThrow("boom");
        });
    });

    describe("teardownClusterPullPipeline", () => {
        it("fans out removal across all active cluster clients, isolating failures", async () => {
            const c1 = { removePath: jest.fn().mockRejectedValue(new Error("down")) };
            const c2 = { removePath: jest.fn().mockResolvedValue(undefined) };
            clusterNodes.getActiveNodes.mockResolvedValue([
                { podId: "a", client: c1 },
                { podId: "b", client: c2 },
            ] as never);

            await expect(service.teardownClusterPullPipeline("live")).resolves.toBeUndefined();

            expect(c1.removePath).toHaveBeenCalledWith("live");
            expect(c2.removePath).toHaveBeenCalledWith("live");
        });

        it("treats a 404 from a node that doesn't host the path as success (no warning)", async () => {
            const c1 = {
                removePath: jest
                    .fn()
                    .mockRejectedValue({ isAxiosError: true, response: { status: 404 } }),
            };
            clusterNodes.getActiveNodes.mockResolvedValue([{ podId: "a", client: c1 }] as never);
            const warn = jest.spyOn(
                (service as never as { logger: { warn: jest.Mock } }).logger,
                "warn",
            );

            await service.teardownClusterPullPipeline("live");

            expect(warn).not.toHaveBeenCalled();
        });
    });
});
