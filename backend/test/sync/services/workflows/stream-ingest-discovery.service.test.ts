import { Test, TestingModule } from "@nestjs/testing";

import { StreamStatus } from "@/common";
import { SyncDiscoveredStream } from "@/sync/domain";
import { Stream, StreamsFacadeService } from "@/streams";
import { StreamIngestDiscoveryService } from "@/sync/services/workflows/stream-ingest-discovery.service";

const makeStream = (overrides: Partial<Stream> = {}): Stream => ({
    name: "stream-1",
    source: "rtsp://source",
    status: StreamStatus.DISCOVERED,
    metadata: {},
    isEnabled: true,
    isManual: false,
    activeConsumers: 0,
    assignedPod: null,
    assignedAt: null,
    lastSeenAt: new Date(),
    lastSyncedAt: null,
    lastError: null,
    ...overrides,
});

const makeDiscoveredStream = (
    overrides: Partial<SyncDiscoveredStream> = {},
): SyncDiscoveredStream => ({
    name: "stream-1",
    source: "rtsp://source",
    status: "ready",
    video: { codec: "H264", width: 1920, height: 1080, fps: 30 },
    audio: { codec: "AAC", channels: 2, sampleRate: 48000 },
    metadata: { bytesReceived: 1024, readers: 3 },
    ...overrides,
});

describe("StreamIngestDiscoveryService", () => {
    let service: StreamIngestDiscoveryService;
    let streams: jest.Mocked<StreamsFacadeService>;

    beforeEach(async () => {
        streams = {
            upsertFromDiscovery: jest.fn(),
        } as unknown as jest.Mocked<StreamsFacadeService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamIngestDiscoveryService,
                { provide: StreamsFacadeService, useValue: streams },
            ],
        }).compile();

        service = module.get<StreamIngestDiscoveryService>(StreamIngestDiscoveryService);
    });

    it("merges discovery track and metadata fields before delegating to StreamsFacadeService", async () => {
        const discovered = makeDiscoveredStream();
        const stream = makeStream();
        streams.upsertFromDiscovery.mockResolvedValue(stream);

        const result = await service.upsertDiscoveredStream(discovered);

        expect(result).toBe(stream);
        expect(streams.upsertFromDiscovery).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "stream-1",
                source: "rtsp://source",
                status: "ready",
                isEnabled: true,
                metadata: expect.objectContaining({
                    width: 1920,
                    height: 1080,
                    fps: 30,
                    channels: 2,
                    sampleRate: 48000,
                    bytesReceived: 1024,
                    readers: 3,
                }),
                lastSeenAt: expect.any(Date),
            }),
        );
    });

    it("defaults an empty discovery status to DISCOVERED", async () => {
        streams.upsertFromDiscovery.mockResolvedValue(makeStream());

        await service.upsertDiscoveredStream(makeDiscoveredStream({ status: "" }));

        expect(streams.upsertFromDiscovery).toHaveBeenCalledWith(
            expect.objectContaining({ status: StreamStatus.DISCOVERED }),
        );
    });
});
