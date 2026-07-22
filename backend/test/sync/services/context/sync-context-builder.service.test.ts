import { Test, TestingModule } from "@nestjs/testing";

import { NodeRole } from "@/common";
import { NodeQueryService } from "@/nodes";
import { MediaMtxStreamInfo } from "@/infrastructure";
import { Stream, StreamsFacadeService } from "@/streams";
import { SyncContextBuilderService } from "@/sync/services";
import { MediaMtxStreamListingService } from "@/media-nodes";

const makeStream = (name: string): MediaMtxStreamInfo => ({
    name,
    source: "rtsp://host/path",
    status: "ready",
});

const makeContextual = (name: string, context: NodeRole, nodeId: string | null) => ({
    stream: makeStream(name),
    context,
    nodeId,
});

describe("SyncContextBuilderService", () => {
    let service: SyncContextBuilderService;
    let mediaMtxQuery: jest.Mocked<MediaMtxStreamListingService>;
    let streams: jest.Mocked<StreamsFacadeService>;
    let nodesService: jest.Mocked<NodeQueryService>;

    beforeEach(async () => {
        mediaMtxQuery = {
            listStreams: jest.fn(),
        } as unknown as jest.Mocked<MediaMtxStreamListingService>;

        streams = {
            findAll: jest.fn(),
        } as unknown as jest.Mocked<StreamsFacadeService>;

        nodesService = {
            listActiveNodeIds: jest.fn(),
        } as unknown as jest.Mocked<NodeQueryService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SyncContextBuilderService,
                { provide: MediaMtxStreamListingService, useValue: mediaMtxQuery },
                { provide: StreamsFacadeService, useValue: streams },
                { provide: NodeQueryService, useValue: nodesService },
            ],
        }).compile();

        service = module.get<SyncContextBuilderService>(SyncContextBuilderService);
    });

    describe("buildContext", () => {
        beforeEach(() => {
            mediaMtxQuery.listStreams.mockImplementation(async (role) =>
                role === NodeRole.INGEST
                    ? {
                          streams: [makeContextual("ingest-1", NodeRole.INGEST, "ingest-a")],
                          nodeIds: ["ingest-a"],
                          observedNodeIds: ["ingest-a"],
                      }
                    : {
                          streams: [makeContextual("cluster-1", NodeRole.CLUSTER, null)],
                          nodeIds: ["cluster-a"],
                          observedNodeIds: ["cluster-a"],
                      },
            );
            nodesService.listActiveNodeIds.mockResolvedValue(["node-a", "node-b"]);
            streams.findAll.mockResolvedValue([] as Stream[]);
        });

        it("calls all four data sources in parallel", async () => {
            await service.buildContext();

            expect(mediaMtxQuery.listStreams).toHaveBeenCalledWith(NodeRole.INGEST);
            expect(mediaMtxQuery.listStreams).toHaveBeenCalledWith(NodeRole.CLUSTER);
            expect(nodesService.listActiveNodeIds).toHaveBeenCalledWith(NodeRole.CLUSTER);
            expect(streams.findAll).toHaveBeenCalledTimes(1);
        });

        it("assembles ingestList carrying each stream's ingest node", async () => {
            const ctx = await service.buildContext();
            expect(ctx.ingestList).toHaveLength(1);
            expect(ctx.ingestList[0].name).toBe("ingest-1");
            expect(ctx.ingestList[0].ingestNode).toBe("ingest-a");
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

        it("includes nodeIds from the nodes service", async () => {
            const ctx = await service.buildContext();
            expect(ctx.nodeIds).toEqual(["node-a", "node-b"]);
        });

        it("carries ingest observation coverage for safe staleness decisions", async () => {
            mediaMtxQuery.listStreams.mockImplementation(async (role) =>
                role === NodeRole.INGEST
                    ? {
                          streams: [],
                          nodeIds: ["ingest-a", "ingest-b"],
                          observedNodeIds: ["ingest-b"],
                      }
                    : { streams: [], nodeIds: [], observedNodeIds: [] },
            );

            const ctx = await service.buildContext();

            expect(ctx.ingestNodeIds).toEqual(new Set(["ingest-a", "ingest-b"]));
            expect(ctx.observedIngestNodeIds).toEqual(new Set(["ingest-b"]));
        });

        it("includes allStreams from the stream query", async () => {
            const fakeStreams = [{ name: "db-stream-1" }] as Stream[];
            streams.findAll.mockResolvedValue(fakeStreams);

            const ctx = await service.buildContext();
            expect(ctx.allStreams).toBe(fakeStreams);
        });

        it("returns empty Sets and arrays when nothing is active", async () => {
            mediaMtxQuery.listStreams.mockResolvedValue({
                streams: [],
                nodeIds: [],
                observedNodeIds: [],
            });
            nodesService.listActiveNodeIds.mockResolvedValue([]);
            streams.findAll.mockResolvedValue([]);

            const ctx = await service.buildContext();

            expect(ctx.ingestNames.size).toBe(0);
            expect(ctx.clusterNames.size).toBe(0);
            expect(ctx.ingestNodeIds.size).toBe(0);
            expect(ctx.observedIngestNodeIds.size).toBe(0);
            expect(ctx.nodeIds).toEqual([]);
            expect(ctx.allStreams).toEqual([]);
        });
    });
});
