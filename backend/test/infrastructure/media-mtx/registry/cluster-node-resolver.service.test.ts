import { Test, TestingModule } from "@nestjs/testing";

import { PodRole } from "@/common";
// PodQueryService is imported from its sub-barrel, not the @/pods root barrel:
// the root barrel pulls PodsModule → @/infrastructure, and entering that cycle
// from the pods side leaves the DI token undefined at decoration time
// (see ADR-0008 — barrel imports are evaluation-order sensitive).
import { PodQueryService } from "@/pods/services";
import { ClusterNodeResolverService, MediaMtxClientRegistry } from "@/infrastructure";

describe("ClusterNodeResolverService", () => {
    let service: ClusterNodeResolverService;
    let podsService: jest.Mocked<PodQueryService>;
    let registry: jest.Mocked<MediaMtxClientRegistry>;

    const clientA = { id: "a" } as never;
    const clientB = { id: "b" } as never;
    const staticClient = { id: "static" } as never;

    beforeEach(async () => {
        podsService = {
            listActivePodRefs: jest.fn(),
        } as unknown as jest.Mocked<PodQueryService>;

        registry = {
            getClusterClientsFromPods: jest.fn(),
            getStaticClusterClients: jest.fn(),
            pickClusterClient: jest.fn(),
        } as unknown as jest.Mocked<MediaMtxClientRegistry>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ClusterNodeResolverService,
                { provide: PodQueryService, useValue: podsService },
                { provide: MediaMtxClientRegistry, useValue: registry },
            ],
        }).compile();

        service = module.get(ClusterNodeResolverService);
    });

    describe("getActiveClusterClients", () => {
        it("builds clients from registered cluster pods", async () => {
            const pods = [{ podId: "c1", host: "10.0.0.1", type: PodRole.CLUSTER }];
            podsService.listActivePodRefs.mockResolvedValue(pods);
            registry.getClusterClientsFromPods.mockReturnValue([clientA, clientB]);

            const result = await service.getActiveClusterClients();

            expect(podsService.listActivePodRefs).toHaveBeenCalledWith(PodRole.CLUSTER);
            expect(registry.getClusterClientsFromPods).toHaveBeenCalledWith(pods);
            expect(result).toEqual([clientA, clientB]);
            expect(registry.getStaticClusterClients).not.toHaveBeenCalled();
        });

        it("falls back to the static pool when no cluster pods are registered", async () => {
            podsService.listActivePodRefs.mockResolvedValue([]);
            registry.getStaticClusterClients.mockReturnValue([staticClient]);

            const result = await service.getActiveClusterClients();

            expect(result).toEqual([staticClient]);
            expect(registry.getClusterClientsFromPods).not.toHaveBeenCalled();
        });
    });

    describe("resolveClientForPod", () => {
        it("returns the client for the matching active pod", async () => {
            const pods = [
                { podId: "c1", host: "10.0.0.1", type: PodRole.CLUSTER },
                { podId: "c2", host: "10.0.0.2", type: PodRole.CLUSTER },
            ];
            podsService.listActivePodRefs.mockResolvedValue(pods);
            registry.getClusterClientsFromPods.mockReturnValue([clientB]);

            const result = await service.resolveClientForPod("c2");

            expect(registry.getClusterClientsFromPods).toHaveBeenCalledWith([pods[1]]);
            expect(result).toBe(clientB);
            expect(registry.pickClusterClient).not.toHaveBeenCalled();
        });

        it("falls back to a static pick when the assigned pod is not active", async () => {
            podsService.listActivePodRefs.mockResolvedValue([
                { podId: "c1", host: "10.0.0.1", type: PodRole.CLUSTER },
            ]);
            registry.pickClusterClient.mockReturnValue(staticClient);

            const result = await service.resolveClientForPod("ghost-pod");

            expect(result).toBe(staticClient);
            expect(registry.getClusterClientsFromPods).not.toHaveBeenCalled();
        });

        it("falls back to a static pick when no pod id is given", async () => {
            registry.pickClusterClient.mockReturnValue(staticClient);

            const result = await service.resolveClientForPod(null);

            expect(result).toBe(staticClient);
            expect(podsService.listActivePodRefs).not.toHaveBeenCalled();
        });
    });
});
