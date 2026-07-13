import { Test, TestingModule } from "@nestjs/testing";

import { ConfigService } from "@/config";
import { NodeResolver } from "@/media-nodes/services";
import { MediaMtxPipelineService } from "@/media-nodes";
import { type MediaMtxStreamInfo } from "@/infrastructure";

const stream = (overrides: Partial<MediaMtxStreamInfo> = {}): MediaMtxStreamInfo => ({
    name: "live",
    source: "rtspSession",
    status: "ready",
    ...overrides,
});

describe("MediaMtxPipelineService", () => {
    let service: MediaMtxPipelineService;
    let clusterNodes: jest.Mocked<NodeResolver>;
    let client: { addPath: jest.Mock; removePath: jest.Mock };

    beforeEach(async () => {
        client = { addPath: jest.fn(), removePath: jest.fn() };
        clusterNodes = {
            getClusterClientForPod: jest.fn().mockResolvedValue(client),
            getActiveClusterClients: jest.fn().mockResolvedValue([client]),
            getIngestPullUrl: jest.fn((name: string) => `rtsp://ingest:8554/${name}`),
        } as unknown as jest.Mocked<NodeResolver>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MediaMtxPipelineService,
                { provide: NodeResolver, useValue: clusterNodes },
                {
                    provide: ConfigService,
                    useValue: {
                        pullableSourceProtocols: [
                            "rtsp",
                            "rtsps",
                            "rtmp",
                            "rtmps",
                            "srt",
                            "http",
                            "https",
                            "udp",
                        ],
                    },
                },
            ],
        }).compile();

        service = module.get(MediaMtxPipelineService);
    });

    describe("buildClusterPullPipeline — pull source", () => {
        it("pulls the path from the ingest over RTSP when the source is a v3 description", async () => {
            client.addPath.mockResolvedValue({});

            await service.buildClusterPullPipeline(stream({ source: "rtspSession" }), "pod-1");

            expect(client.addPath).toHaveBeenCalledWith("live", "rtsp://ingest:8554/live");
        });

        it("pulls from the ingest when the source is 'unknown'", async () => {
            client.addPath.mockResolvedValue({});

            await service.buildClusterPullPipeline(stream({ source: "unknown" }), "pod-1");

            expect(client.addPath).toHaveBeenCalledWith("live", "rtsp://ingest:8554/live");
        });

        it("uses the stored source directly when it is a pullable protocol URL", async () => {
            client.addPath.mockResolvedValue({});

            await service.buildClusterPullPipeline(
                stream({ name: "ext", source: "rtsp://camera.example/feed" }),
                "pod-1",
            );

            expect(client.addPath).toHaveBeenCalledWith("ext", "rtsp://camera.example/feed");
        });
    });

    describe("buildClusterPullPipeline — pod targeting", () => {
        it("creates the pipeline on the client for the assigned pod", async () => {
            client.addPath.mockResolvedValue({});

            await service.buildClusterPullPipeline(stream(), "cluster-pod-2");

            expect(clusterNodes.getClusterClientForPod).toHaveBeenCalledWith("cluster-pod-2");
        });

        it("treats a 409 as an already-existing pipeline", async () => {
            client.addPath.mockRejectedValue({
                isAxiosError: true,
                response: { status: 409 },
            });

            const result = await service.buildClusterPullPipeline(stream(), "pod-1");

            expect(result).toEqual({ alreadyExists: true });
        });

        it("rethrows non-409 failures", async () => {
            client.addPath.mockRejectedValue(new Error("boom"));

            await expect(service.buildClusterPullPipeline(stream(), "pod-1")).rejects.toThrow(
                "boom",
            );
        });
    });

    describe("teardownClusterPullPipeline", () => {
        it("fans out removal across all active cluster clients, isolating failures", async () => {
            const c1 = { removePath: jest.fn().mockRejectedValue(new Error("down")) };
            const c2 = { removePath: jest.fn().mockResolvedValue(undefined) };
            clusterNodes.getActiveClusterClients.mockResolvedValue([c1, c2] as never);

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
            clusterNodes.getActiveClusterClients.mockResolvedValue([c1] as never);
            const warn = jest.spyOn(
                (service as never as { logger: { warn: jest.Mock } }).logger,
                "warn",
            );

            await service.teardownClusterPullPipeline("live");

            expect(warn).not.toHaveBeenCalled();
        });
    });
});
