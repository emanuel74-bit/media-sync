import { Test, TestingModule } from "@nestjs/testing";

import { Pod } from "@/pods";
import { PodRepository } from "@/pods";
import { PodQueryService } from "@/pods";
import { PodRole, PodStatus } from "@/common";
import { RuntimeConfigService } from "@/runtime-config";

const makePod = (podId: string, overrides: Partial<Pod> = {}): Pod => ({
    podId,
    status: PodStatus.ACTIVE,
    lastHeartbeatAt: new Date(),
    host: "10.0.0.1",
    tags: [],
    type: PodRole.CLUSTER,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe("PodQueryService", () => {
    let service: PodQueryService;
    let podRepository: jest.Mocked<PodRepository>;
    let config: jest.Mocked<RuntimeConfigService>;

    beforeEach(async () => {
        podRepository = {
            upsertByPodId: jest.fn(),
            findAll: jest.fn(),
            findActive: jest.fn(),
            findActivePodIds: jest.fn(),
        } as unknown as jest.Mocked<PodRepository>;

        config = {
            podHeartbeatToleranceSeconds: 120,
        } as unknown as jest.Mocked<RuntimeConfigService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PodQueryService,
                { provide: PodRepository, useValue: podRepository },
                { provide: RuntimeConfigService, useValue: config },
            ],
        }).compile();

        service = module.get<PodQueryService>(PodQueryService);
    });

    describe("listPods", () => {
        it("returns all pods from the repository", async () => {
            const pods = [makePod("a"), makePod("b")];
            podRepository.findAll.mockResolvedValue(pods);

            const result = await service.listPods();

            expect(result).toBe(pods);
            expect(podRepository.findAll).toHaveBeenCalledTimes(1);
        });
    });

    describe("getActivePods", () => {
        it("queries findActive with a date 120s in the past", async () => {
            const pods = [makePod("a")];
            podRepository.findActive.mockResolvedValue(pods);
            const before = Date.now();

            const result = await service.getActivePods();

            expect(result).toBe(pods);
            const [since] = podRepository.findActive.mock.calls[0];
            expect(since).toBeInstanceOf(Date);
            expect(since.getTime()).toBeLessThanOrEqual(before - 120 * 1000);
        });

        it("forwards role filter to the repository", async () => {
            podRepository.findActive.mockResolvedValue([]);

            await service.getActivePods(PodRole.CLUSTER);

            expect(podRepository.findActive).toHaveBeenCalledWith(
                expect.any(Date),
                PodRole.CLUSTER,
            );
        });
    });

    describe("listActivePodRefs", () => {
        it("maps pods to ActivePodRef objects", async () => {
            const pods = [makePod("pod-1", { host: "10.0.0.5" }), makePod("pod-2", { host: null })];
            podRepository.findActive.mockResolvedValue(pods);

            const refs = await service.listActivePodRefs();

            expect(refs).toEqual([
                { podId: "pod-1", host: "10.0.0.5", type: PodRole.CLUSTER },
                { podId: "pod-2", host: undefined, type: PodRole.CLUSTER },
            ]);
        });
    });

    describe("listActivePodIds", () => {
        it("returns only the podId strings", async () => {
            podRepository.findActive.mockResolvedValue([makePod("alpha"), makePod("beta")]);

            const ids = await service.listActivePodIds();

            expect(ids).toEqual(["alpha", "beta"]);
        });

        it("returns empty array when no active pods", async () => {
            podRepository.findActive.mockResolvedValue([]);

            const ids = await service.listActivePodIds();

            expect(ids).toEqual([]);
        });
    });
});
