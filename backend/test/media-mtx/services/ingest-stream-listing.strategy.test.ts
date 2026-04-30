import { PodRole } from "@/common";
import { MediaMtxStreamInfo } from "@/media-mtx";
import { PodQueryService } from "@/pods";
import {
    MediaMtxClientRegistry,
    StreamCollectionService,
} from "@/infrastructure";

import { IngestStreamListingStrategy } from "../../../src/media-mtx/services/ingest-stream-listing.strategy";

const makeStream = (name: string): MediaMtxStreamInfo => ({
    name,
    source: "rtsp://host/path",
    status: "ready",
});

describe("IngestStreamListingStrategy", () => {
    let registry: jest.Mocked<MediaMtxClientRegistry>;
    let podsService: jest.Mocked<PodQueryService>;
    let streamCollection: jest.Mocked<StreamCollectionService>;
    let primaryClient: { listPaths: jest.Mock<Promise<MediaMtxStreamInfo[]>, []> };
    let service: IngestStreamListingStrategy;

    beforeEach(() => {
        primaryClient = {
            listPaths: jest.fn(),
        };

        registry = {
            getIngestClient: jest.fn(() => primaryClient as never),
            getIngestClientsFromPods: jest.fn(),
        } as unknown as jest.Mocked<MediaMtxClientRegistry>;

        podsService = {
            listActivePodRefs: jest.fn(),
        } as unknown as jest.Mocked<PodQueryService>;

        streamCollection = {
            collectFromClients: jest.fn(),
        } as unknown as jest.Mocked<StreamCollectionService>;

        service = new IngestStreamListingStrategy(registry, podsService, streamCollection);
    });

    it("returns the primary ingest listing when the primary endpoint succeeds", async () => {
        const streams = [makeStream("ingest-a")];
        primaryClient.listPaths.mockResolvedValue(streams);

        await expect(service.listIngestStreams()).resolves.toEqual(streams);

        expect(podsService.listActivePodRefs).not.toHaveBeenCalled();
        expect(registry.getIngestClientsFromPods).not.toHaveBeenCalled();
        expect(streamCollection.collectFromClients).not.toHaveBeenCalled();
    });

    it("falls back to ingest pod discovery when the primary endpoint fails", async () => {
        const fallbackStreams = [makeStream("ingest-b")];
        const ingestPods = [{ podId: "pod-1", host: "10.0.0.1", type: PodRole.INGEST }];
        const fallbackClients = [{}] as never;

        primaryClient.listPaths.mockRejectedValue(new Error("boom"));
        podsService.listActivePodRefs.mockResolvedValue(ingestPods);
        registry.getIngestClientsFromPods.mockReturnValue(fallbackClients);
        streamCollection.collectFromClients.mockResolvedValue(fallbackStreams);

        await expect(service.listIngestStreams()).resolves.toEqual(fallbackStreams);

        expect(podsService.listActivePodRefs).toHaveBeenCalledWith(PodRole.INGEST);
        expect(registry.getIngestClientsFromPods).toHaveBeenCalledWith(ingestPods);
        expect(streamCollection.collectFromClients).toHaveBeenCalledWith(fallbackClients);
    });
});
