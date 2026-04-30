import { Test, TestingModule } from "@nestjs/testing";

import { Stream } from "@/streams";
import { StreamStatus } from "@/common";
import { SyncDiscoveredStream } from "@/sync";
import { StreamsFacadeService } from "@/streams";

import { StreamIngestDiscoveryService } from "../../../../src/sync/services/workflows/stream-ingest-discovery.service";

const makeDiscovered = (overrides: Partial<SyncDiscoveredStream> = {}): SyncDiscoveredStream =>
    ({
        name: "stream-a",
        source: "rtsp://camera/stream-a",
        status: undefined,
        video: { hasVideo: true },
        audio: { hasAudio: true },
        metadata: { profile: "main" },
        ...overrides,
    }) as SyncDiscoveredStream;

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

    it("merges discovered video, audio, and metadata into the persisted metadata shape", async () => {
        const stream = makeStream();
        const ingest = makeDiscovered();
        streams.upsertFromDiscovery.mockResolvedValue(stream);

        await service.upsertDiscoveredStream(ingest);

        expect(streams.upsertFromDiscovery).toHaveBeenCalledWith(
            expect.objectContaining({
                name: ingest.name,
                source: ingest.source,
                metadata: {
                    hasVideo: true,
                    hasAudio: true,
                    profile: "main",
                },
                isEnabled: true,
                lastSeenAt: expect.any(Date),
            }),
        );
    });

    it("defaults the status to DISCOVERED when ingest status is missing", async () => {
        streams.upsertFromDiscovery.mockResolvedValue(makeStream());

        await service.upsertDiscoveredStream(makeDiscovered({ status: undefined }));

        expect(streams.upsertFromDiscovery).toHaveBeenCalledWith(
            expect.objectContaining({ status: StreamStatus.DISCOVERED }),
        );
    });

    it("passes through an explicit ingest status when one is provided", async () => {
        streams.upsertFromDiscovery.mockResolvedValue(makeStream());

        await service.upsertDiscoveredStream(
            makeDiscovered({
                status: StreamStatus.SYNCED as unknown as SyncDiscoveredStream["status"],
            }),
        );

        expect(streams.upsertFromDiscovery).toHaveBeenCalledWith(
            expect.objectContaining({ status: StreamStatus.SYNCED }),
        );
    });
});
