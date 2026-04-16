import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { StreamInspectionRecorderService } from "./stream-inspection-recorder.service";
import { StreamInspectionRepository } from "../../repositories";
import { MediaMtxStreamStatsService } from "../../../infrastructure/media-mtx/services";
import { PodRole, SystemEventNames } from "../../../common";
import { V3PathItem } from "../../../infrastructure/media-mtx/types";
import { MediaMtxStreamInfo } from "../../../infrastructure/media-mtx/types";

const makeStream = (name = "stream-a"): MediaMtxStreamInfo => ({
    name,
    source: "rtsps://ingest:8322/stream-a",
    status: "ready",
});

const makePathItem = (overrides: Partial<V3PathItem> = {}): V3PathItem => ({
    name: "stream-a",
    bytesReceived: 1024,
    bytesSent: 512,
    readers: 2,
    tracks: [{ type: "video", codec: "H264", width: 1920, height: 1080, fps: 30 }],
    ...overrides,
});

describe("StreamInspectionRecorderService", () => {
    let service: StreamInspectionRecorderService;
    let repo: jest.Mocked<StreamInspectionRepository>;
    let mediaMtxStats: jest.Mocked<MediaMtxStreamStatsService>;
    let events: jest.Mocked<EventEmitter2>;

    beforeEach(async () => {
        repo = { save: jest.fn() } as unknown as jest.Mocked<StreamInspectionRepository>;
        mediaMtxStats = {
            getStreamDetails: jest.fn(),
        } as unknown as jest.Mocked<MediaMtxStreamStatsService>;
        events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamInspectionRecorderService,
                { provide: StreamInspectionRepository, useValue: repo },
                { provide: MediaMtxStreamStatsService, useValue: mediaMtxStats },
                { provide: EventEmitter2, useValue: events },
            ],
        }).compile();

        service = module.get<StreamInspectionRecorderService>(StreamInspectionRecorderService);
    });

    describe("inspectAndRecord — happy path", () => {
        it("saves a record with parsed tracks when stats succeed", async () => {
            mediaMtxStats.getStreamDetails.mockResolvedValue(makePathItem());
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
            mediaMtxStats.getStreamDetails.mockResolvedValue(makePathItem());
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
            mediaMtxStats.getStreamDetails.mockResolvedValue(makePathItem());
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

        it("does not rethrow after error — resolves normally", async () => {
            mediaMtxStats.getStreamDetails.mockRejectedValue(new Error("boom"));
            repo.save.mockResolvedValue(undefined);

            await expect(
                service.inspectAndRecord(makeStream(), PodRole.INGEST),
            ).resolves.toBeUndefined();
        });
    });
});
