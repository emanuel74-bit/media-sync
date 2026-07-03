import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { Stream } from "@/streams/domain";
import { StreamStatus, SystemEventNames } from "@/common";
import { MediaMtxPipelineService } from "@/infrastructure";
import { StreamPipelineService, StreamStatusService } from "@/streams/services";

const makeStream = (overrides: Partial<Stream> = {}): Stream => ({
    name: "s1",
    source: "rtsp://x",
    status: StreamStatus.ASSIGNED,
    metadata: {},
    isEnabled: true,
    isManual: false,
    activeConsumers: 0,
    assignedPod: "pod-1",
    assignedAt: new Date(),
    ...overrides,
});

describe("StreamPipelineService", () => {
    let service: StreamPipelineService;
    let streamStatus: jest.Mocked<StreamStatusService>;
    let mediaMtx: jest.Mocked<MediaMtxPipelineService>;
    let events: jest.Mocked<EventEmitter2>;

    beforeEach(async () => {
        streamStatus = {
            markSynced: jest.fn(),
            markSyncError: jest.fn(),
        } as unknown as jest.Mocked<StreamStatusService>;
        mediaMtx = {
            createClusterPullPipeline: jest.fn(),
            deleteClusterPipeline: jest.fn(),
        } as unknown as jest.Mocked<MediaMtxPipelineService>;
        events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamPipelineService,
                { provide: StreamStatusService, useValue: streamStatus },
                { provide: MediaMtxPipelineService, useValue: mediaMtx },
                { provide: EventEmitter2, useValue: events },
            ],
        }).compile();

        service = module.get<StreamPipelineService>(StreamPipelineService);
    });

    it("build constructs the pipeline on the assigned pod (no status side effects)", async () => {
        const stream = makeStream({ assignedPod: "pod-2" });
        mediaMtx.createClusterPullPipeline.mockResolvedValue({} as never);

        await service.build(stream);

        expect(mediaMtx.createClusterPullPipeline).toHaveBeenCalledWith(
            { name: stream.name, source: stream.source, status: stream.status },
            "pod-2",
        );
        expect(streamStatus.markSynced).not.toHaveBeenCalled();
    });

    describe("deploy", () => {
        it("marks the stream SYNCED and emits stream.synced on success", async () => {
            const stream = makeStream();
            const synced = makeStream({ status: StreamStatus.SYNCED });
            mediaMtx.createClusterPullPipeline.mockResolvedValue({} as never);
            streamStatus.markSynced.mockResolvedValue(synced);

            const result = await service.deploy(stream);

            expect(streamStatus.markSynced).toHaveBeenCalledWith("s1");
            expect(events.emit).toHaveBeenCalledWith(SystemEventNames.STREAM_SYNCED, synced);
            expect(result).toBe(synced);
        });

        it("marks the stream SYNC_ERROR and does not emit on pipeline failure", async () => {
            const stream = makeStream();
            const errored = makeStream({ status: StreamStatus.SYNC_ERROR });
            mediaMtx.createClusterPullPipeline.mockRejectedValue(new Error("pull failed"));
            streamStatus.markSyncError.mockResolvedValue(errored);

            const result = await service.deploy(stream);

            expect(streamStatus.markSyncError).toHaveBeenCalledWith("s1", "pull failed");
            expect(events.emit).not.toHaveBeenCalled();
            expect(result).toBe(errored);
        });
    });

    it("teardown deletes the cluster pipeline and emits stream.removed", async () => {
        const stream = makeStream();
        mediaMtx.deleteClusterPipeline.mockResolvedValue(undefined);

        await service.teardown(stream);

        expect(mediaMtx.deleteClusterPipeline).toHaveBeenCalledWith("s1");
        expect(events.emit).toHaveBeenCalledWith(SystemEventNames.STREAM_REMOVED, "s1");
    });
});
