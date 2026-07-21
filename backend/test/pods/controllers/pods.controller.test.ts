import { Test, TestingModule } from "@nestjs/testing";

import { Pod } from "@/pods/domain";
import { PodRole, PodStatus } from "@/common";
import { PodsController } from "@/pods/controllers";
import { PodQueryService, PodLifecycleService } from "@/pods/services";

const makePod = (overrides: Partial<Pod> = {}): Pod => ({
    podId: "pod-1",
    host: "10.0.0.1",
    apiPort: 9000,
    rtspPort: 8554,
    metricsPort: 9998,
    type: PodRole.CLUSTER,
    status: PodStatus.ACTIVE,
    lastHeartbeatAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe("PodsController", () => {
    let controller: PodsController;
    let podLifecycle: jest.Mocked<PodLifecycleService>;
    let podQuery: jest.Mocked<PodQueryService>;

    beforeEach(async () => {
        podLifecycle = {
            registerPod: jest.fn(),
            heartbeat: jest.fn(),
        } as unknown as jest.Mocked<PodLifecycleService>;

        podQuery = {
            listPods: jest.fn(),
            getActivePods: jest.fn(),
        } as unknown as jest.Mocked<PodQueryService>;

        const module: TestingModule = await Test.createTestingModule({
            controllers: [PodsController],
            providers: [
                { provide: PodLifecycleService, useValue: podLifecycle },
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

    it("passes pod registration fields through to the lifecycle service unchanged", async () => {
        const pod = makePod({ host: "10.0.0.2", type: PodRole.INGEST });
        podLifecycle.registerPod.mockResolvedValue(pod);

        const result = await controller.registerPod({
            podId: "pod-2",
            host: "10.0.0.2",
            type: PodRole.INGEST,
        });

        expect(result).toBe(pod);
        expect(podLifecycle.registerPod).toHaveBeenCalledWith({
            podId: "pod-2",
            host: "10.0.0.2",
            type: PodRole.INGEST,
        });
    });

    it("delegates heartbeat to the lifecycle service", async () => {
        const pod = makePod();
        podLifecycle.heartbeat.mockResolvedValue(pod);

        const result = await controller.heartbeat({ podId: "pod-1" });

        expect(result).toBe(pod);
        expect(podLifecycle.heartbeat).toHaveBeenCalledWith({
            podId: "pod-1",
            resources: undefined,
        });
    });
});
