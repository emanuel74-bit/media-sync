import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { PodRole, TrackType, SystemEventNames } from "@/common";
import { StreamInspectionRepository } from "@/stream-inspection/repositories";
import { StreamInspectionCollectionService } from "@/stream-inspection/services";
import {
    MediaMtxStreamStatsService,
    MediaMtxStreamListingService,
    StreamDetails,
    MediaMtxStreamInfo,
    ContextualMediaMtxStream,
} from "@/infrastructure";

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

const makeContextualStream = (name: string, role: PodRole): ContextualMediaMtxStream => ({
    stream: { name, source: "rtsp://host/path", status: "ready" },
    context: role,
});

describe("StreamInspectionCollectionService", () => {
    let service: StreamInspectionCollectionService;
    let repo: jest.Mocked<StreamInspectionRepository>;
    let mediaMtxStats: jest.Mocked<MediaMtxStreamStatsService>;
    let mediaMtxListing: jest.Mocked<MediaMtxStreamListingService>;
    let events: jest.Mocked<EventEmitter2>;

    beforeEach(async () => {
        repo = { save: jest.fn() } as unknown as jest.Mocked<StreamInspectionRepository>;
        mediaMtxStats = {
            getStreamDetails: jest.fn(),
        } as unknown as jest.Mocked<MediaMtxStreamStatsService>;
        mediaMtxListing = {
            listContextualStreams: jest.fn(),
        } as unknown as jest.Mocked<MediaMtxStreamListingService>;
        events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamInspectionCollectionService,
                { provide: StreamInspectionRepository, useValue: repo },
                { provide: MediaMtxStreamStatsService, useValue: mediaMtxStats },
                { provide: MediaMtxStreamListingService, useValue: mediaMtxListing },
                { provide: EventEmitter2, useValue: events },
            ],
        }).compile();

        service = module.get<StreamInspectionCollectionService>(StreamInspectionCollectionService);
    });

    describe("inspectAllStreams — the scheduled sweep", () => {
        it("inspects and records every contextual stream with its pod-role source", async () => {
            const streams = [
                makeContextualStream("s1", PodRole.INGEST),
                makeContextualStream("s2", PodRole.CLUSTER),
            ];
            mediaMtxListing.listContextualStreams.mockResolvedValue(streams);
            const inspect = jest.spyOn(service, "inspectAndRecord").mockResolvedValue(undefined);

            await service.inspectAllStreams();

            expect(inspect).toHaveBeenCalledTimes(2);
            expect(inspect).toHaveBeenNthCalledWith(1, streams[0].stream, PodRole.INGEST);
            expect(inspect).toHaveBeenNthCalledWith(2, streams[1].stream, PodRole.CLUSTER);
        });

        it("isolates a per-stream failure and continues with the rest", async () => {
            const streams = [
                makeContextualStream("bad", PodRole.INGEST),
                makeContextualStream("good", PodRole.CLUSTER),
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

            await service.inspectAndRecord(makeStream(), PodRole.INGEST);

            expect(repo.save).toHaveBeenCalledTimes(1);
            const saved = repo.save.mock.calls[0][0];
            expect(saved.streamName).toBe("stream-a");
            expect(saved.source).toBe(PodRole.INGEST);
            expect(saved.tracks).toHaveLength(1);
            expect(saved.lastError).toBeNull();
        });

        it("includes bytesReceived, bytesSent, readers in metadata", async () => {
            mediaMtxStats.getStreamDetails.mockResolvedValue(makeDetails());
            repo.save.mockResolvedValue(undefined);

            await service.inspectAndRecord(makeStream(), PodRole.CLUSTER);

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

            await service.inspectAndRecord(makeStream(), PodRole.INGEST);

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

            await service.inspectAndRecord(makeStream(), PodRole.INGEST);

            expect(repo.save).toHaveBeenCalledTimes(1);
            const saved = repo.save.mock.calls[0][0];
            expect(saved.lastError).toBe("connection refused");
            expect(saved.tracks).toEqual([]);
            expect(saved.metadata).toEqual({});
        });

        it("emits STREAM_INSPECTED even on error", async () => {
            mediaMtxStats.getStreamDetails.mockRejectedValue(new Error("timeout"));
            repo.save.mockResolvedValue(undefined);

            await service.inspectAndRecord(makeStream(), PodRole.INGEST);

            expect(events.emit).toHaveBeenCalledWith(
                SystemEventNames.STREAM_INSPECTED,
                expect.objectContaining({ lastError: "timeout" }),
            );
        });

        it("stringifies non-Error thrown values for lastError", async () => {
            mediaMtxStats.getStreamDetails.mockRejectedValue("raw string error");
            repo.save.mockResolvedValue(undefined);

            await service.inspectAndRecord(makeStream(), PodRole.INGEST);

            const saved = repo.save.mock.calls[0][0];
            expect(saved.lastError).toBe("raw string error");
        });

        it("does not rethrow a stats error — resolves normally", async () => {
            mediaMtxStats.getStreamDetails.mockRejectedValue(new Error("boom"));
            repo.save.mockResolvedValue(undefined);

            await expect(
                service.inspectAndRecord(makeStream(), PodRole.INGEST),
            ).resolves.toBeUndefined();
        });
    });
});
