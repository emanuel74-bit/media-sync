import { Test, TestingModule } from "@nestjs/testing";

import { SyncQueryAggregatorService } from "./sync-query-aggregator.service";
import { MediaMtxStreamListingService } from "../../../infrastructure/media-mtx/services";
import { StreamQueryService } from "../../../streams/services/query";
import { PodQueryService } from "../../../pods/services";
import { PodRole } from "../../../common";
import { MediaMtxStreamInfo } from "../../../infrastructure/media-mtx/types";
import { Stream } from "../../../streams/domain";

const makeStream = (name: string): MediaMtxStreamInfo => ({
    name,
    source: "rtsp://host/path",
    status: "ready",
});

describe("SyncQueryAggregatorService", () => {
    let service: SyncQueryAggregatorService;
    let mediaMtxQuery: jest.Mocked<MediaMtxStreamListingService>;
    let streamQuery: jest.Mocked<StreamQueryService>;
    let podsService: jest.Mocked<PodQueryService>;

    beforeEach(async () => {
        mediaMtxQuery = {
            listIngestStreams: jest.fn(),
            listClusterStreams: jest.fn(),
        } as unknown as jest.Mocked<MediaMtxStreamListingService>;

        streamQuery = {
            findAll: jest.fn(),
        } as unknown as jest.Mocked<StreamQueryService>;

        podsService = {
            listActivePodIds: jest.fn(),
        } as unknown as jest.Mocked<PodQueryService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SyncQueryAggregatorService,
                { provide: MediaMtxStreamListingService, useValue: mediaMtxQuery },
                { provide: StreamQueryService, useValue: streamQuery },
                { provide: PodQueryService, useValue: podsService },
            ],
        }).compile();

        service = module.get<SyncQueryAggregatorService>(SyncQueryAggregatorService);
    });

    describe("buildContext", () => {
        beforeEach(() => {
            mediaMtxQuery.listIngestStreams.mockResolvedValue([makeStream("ingest-1")]);
            mediaMtxQuery.listClusterStreams.mockResolvedValue([makeStream("cluster-1")]);
            podsService.listActivePodIds.mockResolvedValue(["pod-a", "pod-b"]);
            streamQuery.findAll.mockResolvedValue([] as Stream[]);
        });

        it("calls all four data sources in parallel", async () => {
            await service.buildContext();

            expect(mediaMtxQuery.listIngestStreams).toHaveBeenCalledTimes(1);
            expect(mediaMtxQuery.listClusterStreams).toHaveBeenCalledTimes(1);
            expect(podsService.listActivePodIds).toHaveBeenCalledWith(PodRole.CLUSTER);
            expect(streamQuery.findAll).toHaveBeenCalledTimes(1);
        });

        it("assembles ingestList correctly", async () => {
            const ctx = await service.buildContext();
            expect(ctx.ingestList).toHaveLength(1);
            expect(ctx.ingestList[0].name).toBe("ingest-1");
        });

        it("assembles clusterList correctly", async () => {
            const ctx = await service.buildContext();
            expect(ctx.clusterList).toHaveLength(1);
            expect(ctx.clusterList[0].name).toBe("cluster-1");
        });

        it("builds ingestNames Set from ingestList", async () => {
            const ctx = await service.buildContext();
            expect(ctx.ingestNames).toBeInstanceOf(Set);
            expect(ctx.ingestNames.has("ingest-1")).toBe(true);
            expect(ctx.ingestNames.has("cluster-1")).toBe(false);
        });

        it("builds clusterNames Set from clusterList", async () => {
            const ctx = await service.buildContext();
            expect(ctx.clusterNames).toBeInstanceOf(Set);
            expect(ctx.clusterNames.has("cluster-1")).toBe(true);
        });

        it("includes podIds from the pods service", async () => {
            const ctx = await service.buildContext();
            expect(ctx.podIds).toEqual(["pod-a", "pod-b"]);
        });

        it("includes allStreams from the stream query", async () => {
            const fakeStreams = [{ name: "db-stream-1" }] as Stream[];
            streamQuery.findAll.mockResolvedValue(fakeStreams);

            const ctx = await service.buildContext();
            expect(ctx.allStreams).toBe(fakeStreams);
        });

        it("returns empty Sets and arrays when nothing is active", async () => {
            mediaMtxQuery.listIngestStreams.mockResolvedValue([]);
            mediaMtxQuery.listClusterStreams.mockResolvedValue([]);
            podsService.listActivePodIds.mockResolvedValue([]);
            streamQuery.findAll.mockResolvedValue([]);

            const ctx = await service.buildContext();

            expect(ctx.ingestNames.size).toBe(0);
            expect(ctx.clusterNames.size).toBe(0);
            expect(ctx.podIds).toEqual([]);
            expect(ctx.allStreams).toEqual([]);
        });
    });
});
