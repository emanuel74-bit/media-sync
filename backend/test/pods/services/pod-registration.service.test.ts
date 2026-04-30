import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { Pod } from "@/pods";
import { PodRepository } from "@/pods";
import { PodRole, PodStatus } from "@/common";
import { SystemEventNames } from "@/system-events";
import { PodRegistrationService } from "@/pods";

const makePod = (overrides: Partial<Pod> = {}): Pod => ({
    podId: "pod-1",
    status: PodStatus.ACTIVE,
    lastHeartbeatAt: new Date(),
    host: "10.0.0.1",
    tags: [],
    type: PodRole.CLUSTER,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe("PodRegistrationService", () => {
    let service: PodRegistrationService;
    let podRepository: jest.Mocked<PodRepository>;
    let events: jest.Mocked<EventEmitter2>;

    beforeEach(async () => {
        podRepository = {
            upsertByPodId: jest.fn(),
            findAll: jest.fn(),
            findActive: jest.fn(),
            findActivePodIds: jest.fn(),
        } as unknown as jest.Mocked<PodRepository>;

        events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PodRegistrationService,
                { provide: PodRepository, useValue: podRepository },
                { provide: EventEmitter2, useValue: events },
            ],
        }).compile();

        service = module.get<PodRegistrationService>(PodRegistrationService);
    });

    describe("registerPod", () => {
        it("upserts the pod with ACTIVE status and emits POD_REGISTERED", async () => {
            const pod = makePod();
            podRepository.upsertByPodId.mockResolvedValue(pod);

            const result = await service.registerPod({ podId: "pod-1" });

            expect(podRepository.upsertByPodId).toHaveBeenCalledWith(
                "pod-1",
                expect.objectContaining({ status: PodStatus.ACTIVE }),
            );
            expect(result).toBe(pod);
            expect(events.emit).toHaveBeenCalledWith(SystemEventNames.POD_REGISTERED, pod);
        });

        it("includes optional fields when provided", async () => {
            const pod = makePod({ host: "10.0.0.2", tags: ["edge"] });
            podRepository.upsertByPodId.mockResolvedValue(pod);

            await service.registerPod({ podId: "pod-1", host: "10.0.0.2", tags: ["edge"] });

            expect(podRepository.upsertByPodId).toHaveBeenCalledWith(
                "pod-1",
                expect.objectContaining({ host: "10.0.0.2", tags: ["edge"] }),
            );
        });

        it("omits optional fields when not provided", async () => {
            podRepository.upsertByPodId.mockResolvedValue(makePod());

            await service.registerPod({ podId: "pod-1" });

            const [, fields] = podRepository.upsertByPodId.mock.calls[0];
            expect(fields).not.toHaveProperty("host");
            expect(fields).not.toHaveProperty("tags");
            expect(fields).not.toHaveProperty("type");
        });

        it("updates lastHeartbeatAt with a recent timestamp", async () => {
            const before = new Date();
            podRepository.upsertByPodId.mockResolvedValue(makePod());

            await service.registerPod({ podId: "pod-1" });

            const [, fields] = podRepository.upsertByPodId.mock.calls[0];
            expect(fields.lastHeartbeatAt).toBeInstanceOf(Date);
            expect((fields.lastHeartbeatAt as Date).getTime()).toBeGreaterThanOrEqual(
                before.getTime(),
            );
        });
    });

    describe("heartbeat", () => {
        it("upserts the pod with ACTIVE status and current timestamp", async () => {
            const pod = makePod();
            podRepository.upsertByPodId.mockResolvedValue(pod);

            const result = await service.heartbeat("pod-1");

            expect(podRepository.upsertByPodId).toHaveBeenCalledWith(
                "pod-1",
                expect.objectContaining({ status: PodStatus.ACTIVE }),
            );
            expect(result).toBe(pod);
        });

        it("does not emit an event", async () => {
            podRepository.upsertByPodId.mockResolvedValue(makePod());

            await service.heartbeat("pod-1");

            expect(events.emit).not.toHaveBeenCalled();
        });
    });
});
