import { PodRole } from "@/common";
import { PodQueryService } from "@/pods";
import { NodeResolver, MediaMtxMetricsService } from "@/media-nodes/services";

const snapshot = (node: string, paths: number, context = PodRole.INGEST) =>
    ({ node: { node, context, paths } }) as never;

describe("MediaMtxMetricsService.getNodeLoads", () => {
    let service: MediaMtxMetricsService;
    let nodes: jest.Mocked<NodeResolver>;
    let pods: jest.Mocked<PodQueryService>;

    beforeEach(() => {
        nodes = {} as unknown as jest.Mocked<NodeResolver>;
        pods = { listActivePodIds: jest.fn() } as unknown as jest.Mocked<PodQueryService>;
        service = new MediaMtxMetricsService(nodes, pods);
    });

    it("reports each active node's live path count, filling absent nodes with zero", async () => {
        pods.listActivePodIds.mockResolvedValue(["a", "b"]);
        jest.spyOn(service, "collect").mockResolvedValue([snapshot("a", 3)]);

        const loads = await service.getNodeLoads(PodRole.INGEST);

        expect(loads).toEqual([
            { podId: "a", load: 3 },
            { podId: "b", load: 0 },
        ]);
        expect(pods.listActivePodIds).toHaveBeenCalledWith(PodRole.INGEST);
    });

    it("ignores snapshots from a different role", async () => {
        pods.listActivePodIds.mockResolvedValue(["a"]);
        jest.spyOn(service, "collect").mockResolvedValue([snapshot("a", 5, PodRole.CLUSTER)]);

        const loads = await service.getNodeLoads(PodRole.INGEST);

        expect(loads).toEqual([{ podId: "a", load: 0 }]);
    });

    it("returns empty when no nodes of the role are active", async () => {
        pods.listActivePodIds.mockResolvedValue([]);
        jest.spyOn(service, "collect").mockResolvedValue([]);

        expect(await service.getNodeLoads(PodRole.INGEST)).toEqual([]);
    });
});
