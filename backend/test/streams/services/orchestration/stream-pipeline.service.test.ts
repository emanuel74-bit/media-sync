import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { Stream } from "@/streams/domain";
import { StreamStatus, SystemEventNames } from "@/common";
import { MediaMtxPipelineService, NodeResolver } from "@/media-nodes";
import { StreamPipelineService, StreamStatusService } from "@/streams/services";

const makeStream = (overrides: Partial<Stream> = {}): Stream => ({
    name: "s1",
    source: "rtsp://x",
    status: StreamStatus.ASSIGNED,
    metadata: {},
    isEnabled: true,
    isManual: false,
    activeConsumers: 0,
    assignedNode: "node-1",
    assignedAt: new Date(),
    ...overrides,
});

describe("StreamPipelineService", () => {
    let service: StreamPipelineService;
    let streamStatus: jest.Mocked<StreamStatusService>;
    let mediaMtx: jest.Mocked<MediaMtxPipelineService>;
    let nodes: jest.Mocked<NodeResolver>;
    let events: jest.Mocked<EventEmitter2>;

    beforeEach(async () => {
        streamStatus = {
            markSynced: jest.fn(),
            markSyncError: jest.fn(),
        } as unknown as jest.Mocked<StreamStatusService>;
        mediaMtx = {
            buildClusterPullPipeline: jest.fn(),
            teardownClusterPullPipeline: jest.fn(),
        } as unknown as jest.Mocked<MediaMtxPipelineService>;
        nodes = {
            getIngestRtspUrl: jest.fn().mockResolvedValue("rtsp://ingest:8554/s1"),
        } as unknown as jest.Mocked<NodeResolver>;
        events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamPipelineService,
                { provide: StreamStatusService, useValue: streamStatus },
                { provide: MediaMtxPipelineService, useValue: mediaMtx },
                { provide: NodeResolver, useValue: nodes },
                { provide: EventEmitter2, useValue: events },
            ],
        }).compile();

        service = module.get<StreamPipelineService>(StreamPipelineService);
    });

    it("build pulls an ingest stream from its ingest node, deploying to the assigned node", async () => {
        const stream = makeStream({ assignedNode: "node-2", ingestNode: "ingest-9" });
        nodes.getIngestRtspUrl.mockResolvedValue("rtsp://ingest:8554/s1");
        mediaMtx.buildClusterPullPipeline.mockResolvedValue({} as never);

        await service.build(stream);

        expect(nodes.getIngestRtspUrl).toHaveBeenCalledWith("ingest-9", stream.name);
        expect(mediaMtx.buildClusterPullPipeline).toHaveBeenCalledWith(
            stream.name,
            "node-2",
            "rtsp://ingest:8554/s1",
        );
        expect(streamStatus.markSynced).not.toHaveBeenCalled();
    });

    it("build uses the stored source directly for a manual stream (no ingest node)", async () => {
        const stream = makeStream({
            assignedNode: "node-2",
            ingestNode: null,
            source: "rtsp://cam/feed",
        });
        mediaMtx.buildClusterPullPipeline.mockResolvedValue({} as never);

        await service.build(stream);

        expect(nodes.getIngestRtspUrl).not.toHaveBeenCalled();
        expect(mediaMtx.buildClusterPullPipeline).toHaveBeenCalledWith(
            stream.name,
            "node-2",
            "rtsp://cam/feed",
        );
    });

    it("build throws for an unassigned stream (no pipeline call)", async () => {
        const stream = makeStream({ assignedNode: null });

        await expect(service.build(stream)).rejects.toThrow(
            `Cannot build cluster pipeline for unassigned stream ${stream.name}`,
        );
        expect(mediaMtx.buildClusterPullPipeline).not.toHaveBeenCalled();
    });

    describe("deploy", () => {
        it("marks the stream SYNCED and emits stream.synced on success", async () => {
            const stream = makeStream();
            const synced = makeStream({ status: StreamStatus.SYNCED });
            mediaMtx.buildClusterPullPipeline.mockResolvedValue({} as never);
            streamStatus.markSynced.mockResolvedValue(synced);

            const result = await service.deploy(stream);

            expect(streamStatus.markSynced).toHaveBeenCalledWith("s1");
            expect(events.emit).toHaveBeenCalledWith(SystemEventNames.STREAM_SYNCED, synced);
            expect(result).toBe(synced);
        });

        it("marks the stream SYNC_ERROR and does not emit on pipeline failure", async () => {
            const stream = makeStream();
            const errored = makeStream({ status: StreamStatus.SYNC_ERROR });
            mediaMtx.buildClusterPullPipeline.mockRejectedValue(new Error("pull failed"));
            streamStatus.markSyncError.mockResolvedValue(errored);

            const result = await service.deploy(stream);

            expect(streamStatus.markSyncError).toHaveBeenCalledWith("s1", "pull failed");
            expect(events.emit).not.toHaveBeenCalled();
            expect(result).toBe(errored);
        });
    });

    it("teardown deletes the cluster pipeline and emits stream.removed", async () => {
        const stream = makeStream();
        mediaMtx.teardownClusterPullPipeline.mockResolvedValue(undefined);

        await service.teardown(stream);

        expect(mediaMtx.teardownClusterPullPipeline).toHaveBeenCalledWith("s1");
        expect(events.emit).toHaveBeenCalledWith(SystemEventNames.STREAM_REMOVED, "s1");
    });
});
