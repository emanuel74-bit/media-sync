import { Test, TestingModule } from "@nestjs/testing";

import { Pod } from "@/pods/domain";
import { PodRole, PodStatus } from "@/common";
import { PodsController } from "@/pods/controllers";
import { PodQueryService, PodRegistrationService } from "@/pods/services";

const makePod = (overrides: Partial<Pod> = {}): Pod => ({
    podId: "pod-1",
    host: "10.0.0.1",
    tags: [],
    type: PodRole.CLUSTER,
    status: PodStatus.ACTIVE,
    lastHeartbeatAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe("PodsController", () => {
    let controller: PodsController;
    let podRegistration: jest.Mocked<PodRegistrationService>;
    let podQuery: jest.Mocked<PodQueryService>;

    beforeEach(async () => {
        podRegistration = {
            registerPod: jest.fn(),
            heartbeat: jest.fn(),
        } as unknown as jest.Mocked<PodRegistrationService>;

        podQuery = {
            listPods: jest.fn(),
            getActivePods: jest.fn(),
        } as unknown as jest.Mocked<PodQueryService>;

        const module: TestingModule = await Test.createTestingModule({
            controllers: [PodsController],
            providers: [
                { provide: PodRegistrationService, useValue: podRegistration },
                { provide: PodQueryService, useValue: podQuery },
            ],
        }).compile();

        controller = module.get<PodsController>(PodsController);
    });

    it("delegates listPods to PodQueryService", async () => {
        const pods = [makePod()];
        podQuery.listPods.mockResolvedValue(pods);

        const result = await controller.listPods();

        expect(result).toBe(pods);
        expect(podQuery.listPods).toHaveBeenCalledTimes(1);
    });

    it("delegates listActivePods to PodQueryService", async () => {
        const pods = [makePod()];
        podQuery.getActivePods.mockResolvedValue(pods);

        const result = await controller.listActivePods();

        expect(result).toBe(pods);
        expect(podQuery.getActivePods).toHaveBeenCalledTimes(1);
    });

    it("defaults registerPod to cluster role and empty tags", async () => {
        const pod = makePod();
        podRegistration.registerPod.mockResolvedValue(pod);

        const result = await controller.registerPod({ podId: "pod-1" });

        expect(result).toBe(pod);
        expect(podRegistration.registerPod).toHaveBeenCalledWith({
            podId: "pod-1",
            host: undefined,
            tags: [],
            type: PodRole.CLUSTER,
        });
    });

    it("passes explicit pod registration fields through unchanged", async () => {
        const pod = makePod({ host: "10.0.0.2", tags: ["edge"], type: PodRole.INGEST });
        podRegistration.registerPod.mockResolvedValue(pod);

        const result = await controller.registerPod({
            podId: "pod-2",
            host: "10.0.0.2",
            tags: ["edge"],
            type: PodRole.INGEST,
        });

        expect(result).toBe(pod);
        expect(podRegistration.registerPod).toHaveBeenCalledWith({
            podId: "pod-2",
            host: "10.0.0.2",
            tags: ["edge"],
            type: PodRole.INGEST,
        });
    });

    it("delegates heartbeat to PodRegistrationService", async () => {
        const pod = makePod();
        podRegistration.heartbeat.mockResolvedValue(pod);

        const result = await controller.heartbeat({ podId: "pod-1" });

        expect(result).toBe(pod);
        expect(podRegistration.heartbeat).toHaveBeenCalledWith({
            podId: "pod-1",
            resources: undefined,
        });
    });
});
