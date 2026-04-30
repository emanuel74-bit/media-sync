import { Stream } from "@/streams";
import { StreamStatus } from "@/common";

import { StreamRepository } from "../../../../src/streams/repositories/stream.repository";
import { StreamStatusService } from "../../../../src/streams/services/mutation/stream-status.service";

const makeStream = (overrides: Partial<Stream> = {}): Stream =>
    ({
        name: "stream-a",
        source: "rtsp://camera/stream-a",
        status: StreamStatus.DISCOVERED,
        isEnabled: true,
        isManual: false,
        metadata: {},
        activeConsumers: 0,
        lastError: null,
        ...overrides,
    }) as Stream;

describe("StreamStatusService", () => {
    let service: StreamStatusService;
    let streamRepository: jest.Mocked<StreamRepository>;

    beforeEach(() => {
        streamRepository = {
            upsert: jest.fn(),
            update: jest.fn(),
        } as unknown as jest.Mocked<StreamRepository>;

        service = new StreamStatusService(streamRepository);
    });

    it("forces isManual to false when upserting a discovered stream", async () => {
        const stream = makeStream();
        streamRepository.upsert.mockResolvedValue(stream);

        await service.upsertFromDiscovery({ name: "stream-a", source: "rtsp://source" });

        expect(streamRepository.upsert).toHaveBeenCalledWith(
            "stream-a",
            expect.objectContaining({
                source: "rtsp://source",
                isManual: false,
            }),
        );
    });

    it("marks a stream as synced and clears the last error", async () => {
        streamRepository.update.mockResolvedValue(makeStream({ status: StreamStatus.SYNCED }));

        await service.markSynced("stream-a");

        expect(streamRepository.update).toHaveBeenCalledWith(
            "stream-a",
            expect.objectContaining({
                status: StreamStatus.SYNCED,
                lastError: null,
            }),
        );
    });

    it("marks a stream with a sync error message", async () => {
        streamRepository.update.mockResolvedValue(makeStream({ status: StreamStatus.SYNC_ERROR }));

        await service.markSyncError("stream-a", "network error");

        expect(streamRepository.update).toHaveBeenCalledWith("stream-a", {
            status: StreamStatus.SYNC_ERROR,
            lastError: "network error",
        });
    });

    it("marks a stream stale and updates lastSeenAt", async () => {
        streamRepository.update.mockResolvedValue(makeStream({ status: StreamStatus.STALE }));

        await service.markStale("stream-a");

        expect(streamRepository.update).toHaveBeenCalledWith(
            "stream-a",
            expect.objectContaining({
                status: StreamStatus.STALE,
                lastSeenAt: expect.any(Date),
            }),
        );
    });
});
