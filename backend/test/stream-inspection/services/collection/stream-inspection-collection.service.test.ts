import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { Stream, StreamsFacadeService } from "@/streams";
import { NodeRole, TrackType, SystemEventNames } from "@/common";
import { StreamDetails, MediaMtxStreamInfo } from "@/infrastructure";
import { StreamInspectionRepository } from "@/stream-inspection/repositories";
import { StreamInspectionCollectionService } from "@/stream-inspection/services";
import {
    ContextualMediaMtxStream,
    MediaMtxStreamStatsService,
    MediaMtxStreamListingService,
} from "@/media-nodes";

const makeStream = (name = "stream-a"): MediaMtxStreamInfo => ({
    name,
    source: "rtsps://ingest:8322/stream-a",
    status: "ready",
});

const makeDetails = (overrides: Partial<StreamDetails> = {}): StreamDetails => ({
    streamName: "stream-a",
    tracks: [{ type: TrackType.VIDEO, codec: "H264", width: 1920, height: 1080, fps: 30 }],
    metadata: { bytesReceived: 1024, bytesSent: 512, readers: 2 },
    ...overrides,
});

const makeContextualStream = (name: string, role: NodeRole): ContextualMediaMtxStream => ({
    stream: { name, source: "rtsp://host/path", status: "ready" },
    context: role,
});

describe("StreamInspectionCollectionService", () => {
    let service: StreamInspectionCollectionService;
    let repo: jest.Mocked<StreamInspectionRepository>;
    let mediaMtxStats: jest.Mocked<MediaMtxStreamStatsService>;
    let mediaMtxListing: jest.Mocked<MediaMtxStreamListingService>;
    let streamsFacade: jest.Mocked<StreamsFacadeService>;
    let events: jest.Mocked<EventEmitter2>;

    beforeEach(async () => {
        repo = { save: jest.fn() } as unknown as jest.Mocked<StreamInspectionRepository>;
        mediaMtxStats = {
            getStreamDetails: jest.fn(),
        } as unknown as jest.Mocked<MediaMtxStreamStatsService>;
        mediaMtxListing = {
            listContextualStreams: jest.fn(),
        } as unknown as jest.Mocked<MediaMtxStreamListingService>;
        streamsFacade = {
            findAll: jest.fn().mockResolvedValue([]),
        } as unknown as jest.Mocked<StreamsFacadeService>;
        events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamInspectionCollectionService,
                { provide: StreamInspectionRepository, useValue: repo },
                { provide: MediaMtxStreamStatsService, useValue: mediaMtxStats },
                { provide: MediaMtxStreamListingService, useValue: mediaMtxListing },
                { provide: StreamsFacadeService, useValue: streamsFacade },
                { provide: EventEmitter2, useValue: events },
            ],
        }).compile();

        service = module.get<StreamInspectionCollectionService>(StreamInspectionCollectionService);
    });

    describe("inspectAllStreams — the scheduled sweep", () => {
        it("inspects and records every contextual stream with its node-role source", async () => {
            const streams = [
                makeContextualStream("s1", NodeRole.INGEST),
                makeContextualStream("s2", NodeRole.CLUSTER),
            ];
            mediaMtxListing.listContextualStreams.mockResolvedValue(streams);
            const inspect = jest.spyOn(service, "inspectAndRecord").mockResolvedValue(undefined);

            await service.inspectAllStreams();

            expect(inspect).toHaveBeenCalledTimes(2);
            expect(inspect).toHaveBeenNthCalledWith(
                1,
                streams[0].stream,
                NodeRole.INGEST,
                undefined,
            );
            expect(inspect).toHaveBeenNthCalledWith(
                2,
                streams[1].stream,
                NodeRole.CLUSTER,
                undefined,
            );
        });

        it("threads the assigned node id for a cluster stream (so stats hit the right node)", async () => {
            mediaMtxListing.listContextualStreams.mockResolvedValue([
                makeContextualStream("cam", NodeRole.CLUSTER),
            ]);
            streamsFacade.findAll.mockResolvedValue([
                { name: "cam", assignedNode: "node-x" } as Stream,
            ]);
            const inspect = jest.spyOn(service, "inspectAndRecord").mockResolvedValue(undefined);

            await service.inspectAllStreams();

            expect(inspect).toHaveBeenCalledWith(expect.anything(), NodeRole.CLUSTER, "node-x");
        });

        it("isolates a per-stream failure and continues with the rest", async () => {
            const streams = [
                makeContextualStream("bad", NodeRole.INGEST),
                makeContextualStream("good", NodeRole.CLUSTER),
            ];
            mediaMtxListing.listContextualStreams.mockResolvedValue(streams);
            jest.spyOn(
                (service as unknown as { logger: { error: jest.Mock } }).logger,
                "error",
            ).mockImplementation();
            const inspect = jest
                .spyOn(service, "inspectAndRecord")
                .mockRejectedValueOnce(new Error("record failed"))
                .mockResolvedValueOnce(undefined);

            await service.inspectAllStreams();

            expect(inspect).toHaveBeenCalledTimes(2);
        });

        it("does nothing when there are no streams", async () => {
            mediaMtxListing.listContextualStreams.mockResolvedValue([]);
            const inspect = jest.spyOn(service, "inspectAndRecord");

            await service.inspectAllStreams();

            expect(inspect).not.toHaveBeenCalled();
        });

        it("propagates a listing failure (the scheduler guards it) without inspecting", async () => {
            mediaMtxListing.listContextualStreams.mockRejectedValue(new Error("listing failed"));
            const inspect = jest.spyOn(service, "inspectAndRecord");

            await expect(service.inspectAllStreams()).rejects.toThrow("listing failed");
            expect(inspect).not.toHaveBeenCalled();
        });
    });

    describe("inspectAndRecord — happy path", () => {
        it("saves a record with parsed tracks when stats succeed", async () => {
            mediaMtxStats.getStreamDetails.mockResolvedValue(makeDetails());
            repo.save.mockResolvedValue(undefined);

            await service.inspectAndRecord(makeStream(), NodeRole.INGEST, "ingest-1");

            expect(mediaMtxStats.getStreamDetails).toHaveBeenCalledWith(
                NodeRole.INGEST,
                "stream-a",
                "ingest-1",
            );
            expect(repo.save).toHaveBeenCalledTimes(1);
            const saved = repo.save.mock.calls[0][0];
            expect(saved.streamName).toBe("stream-a");
            expect(saved.source).toBe(NodeRole.INGEST);
            expect(saved.tracks).toHaveLength(1);
            expect(saved.lastError).toBeNull();
        });

        it("includes bytesReceived, bytesSent, readers in metadata", async () => {
            mediaMtxStats.getStreamDetails.mockResolvedValue(makeDetails());
            repo.save.mockResolvedValue(undefined);

            await service.inspectAndRecord(makeStream(), NodeRole.CLUSTER, "node-x");

            expect(mediaMtxStats.getStreamDetails).toHaveBeenCalledWith(
                NodeRole.CLUSTER,
                "stream-a",
                "node-x",
            );
            const saved = repo.save.mock.calls[0][0];
            expect(saved.metadata).toMatchObject({
                bytesReceived: 1024,
                bytesSent: 512,
                readers: 2,
            });
        });

        it("emits STREAM_INSPECTED after a successful save", async () => {
            mediaMtxStats.getStreamDetails.mockResolvedValue(makeDetails());
            repo.save.mockResolvedValue(undefined);

            await service.inspectAndRecord(makeStream(), NodeRole.INGEST, "ingest-1");

            expect(events.emit).toHaveBeenCalledWith(
                SystemEventNames.STREAM_INSPECTED,
                expect.objectContaining({ streamName: "stream-a" }),
            );
        });
    });

    describe("inspectAndRecord — error path", () => {
        it("saves a record with lastError and empty tracks when stats throw", async () => {
            mediaMtxStats.getStreamDetails.mockRejectedValue(new Error("connection refused"));
            repo.save.mockResolvedValue(undefined);

            await service.inspectAndRecord(makeStream(), NodeRole.INGEST, "ingest-1");

            expect(repo.save).toHaveBeenCalledTimes(1);
            const saved = repo.save.mock.calls[0][0];
            expect(saved.lastError).toBe("connection refused");
            expect(saved.tracks).toEqual([]);
            expect(saved.metadata).toEqual({});
        });

        it("emits STREAM_INSPECTED even on error", async () => {
            mediaMtxStats.getStreamDetails.mockRejectedValue(new Error("timeout"));
            repo.save.mockResolvedValue(undefined);

            await service.inspectAndRecord(makeStream(), NodeRole.INGEST, "ingest-1");

            expect(events.emit).toHaveBeenCalledWith(
                SystemEventNames.STREAM_INSPECTED,
                expect.objectContaining({ lastError: "timeout" }),
            );
        });

        it("stringifies non-Error thrown values for lastError", async () => {
            mediaMtxStats.getStreamDetails.mockRejectedValue("raw string error");
            repo.save.mockResolvedValue(undefined);

            await service.inspectAndRecord(makeStream(), NodeRole.INGEST, "ingest-1");

            const saved = repo.save.mock.calls[0][0];
            expect(saved.lastError).toBe("raw string error");
        });

        it("does not rethrow a stats error — resolves normally", async () => {
            mediaMtxStats.getStreamDetails.mockRejectedValue(new Error("boom"));
            repo.save.mockResolvedValue(undefined);

            await expect(
                service.inspectAndRecord(makeStream(), NodeRole.INGEST, "ingest-1"),
            ).resolves.toBeUndefined();
        });

        it("records lastError for a stream with no known node (never picks a wrong node)", async () => {
            repo.save.mockResolvedValue(undefined);

            await service.inspectAndRecord(makeStream(), NodeRole.CLUSTER);

            expect(mediaMtxStats.getStreamDetails).not.toHaveBeenCalled();
            const saved = repo.save.mock.calls[0][0];
            expect(saved.lastError).toBe("cluster stream stream-a has no known node");
            expect(saved.tracks).toEqual([]);
        });
    });
});
