import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { Pod } from "@/pods/domain";
import { ConfigService } from "@/config";
import { SystemEventNames } from "@/common";
import { PodRole, PodStatus } from "@/common";
import { PodRepository } from "@/pods/repositories";
import { PodLifecycleService } from "@/pods/services";

const makePod = (overrides: Partial<Pod> = {}): Pod => ({
    podId: "pod-1",
    status: PodStatus.ACTIVE,
    lastHeartbeatAt: new Date(),
    host: "10.0.0.1",
    apiPort: 9000,
    rtspPort: 8554,
    metricsPort: 9998,
    type: PodRole.CLUSTER,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe("PodLifecycleService", () => {
    let service: PodLifecycleService;
    let podRepository: jest.Mocked<PodRepository>;
    let events: jest.Mocked<EventEmitter2>;

    beforeEach(async () => {
        podRepository = {
            upsertByPodId: jest.fn(),
            findAll: jest.fn(),
            findActive: jest.fn(),
        } as unknown as jest.Mocked<PodRepository>;

        events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

        const config = {
            ingestPodMediaMtxPort: 9000,
            clusterPodMediaMtxPort: 9000,
            mediaMtxRtspPort: 8554,
            mediaMtxMetricsPort: 9998,
        } as unknown as ConfigService;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PodLifecycleService,
                { provide: PodRepository, useValue: podRepository },
                { provide: ConfigService, useValue: config },
                { provide: EventEmitter2, useValue: events },
            ],
        }).compile();

        service = module.get<PodLifecycleService>(PodLifecycleService);
    });

    describe("registerPod", () => {
        it("upserts the pod with ACTIVE status, host, and type and emits POD_REGISTERED", async () => {
            const pod = makePod();
            podRepository.upsertByPodId.mockResolvedValue(pod);

            const result = await service.registerPod({
                podId: "pod-1",
                host: "10.0.0.2",
                type: PodRole.INGEST,
            });

            expect(podRepository.upsertByPodId).toHaveBeenCalledWith(
                "pod-1",
                expect.objectContaining({
                    status: PodStatus.ACTIVE,
                    lastHeartbeatAt: expect.any(Date),
                    host: "10.0.0.2",
                    type: PodRole.INGEST,
                }),
            );
            expect(result).toBe(pod);
            expect(events.emit).toHaveBeenCalledWith(SystemEventNames.POD_REGISTERED, pod);
        });

        it("persists self-reported ports when present", async () => {
            podRepository.upsertByPodId.mockResolvedValue(makePod());

            await service.registerPod({
                podId: "pod-1",
                host: "10.0.3.10",
                apiPort: 9001,
                rtspPort: 8555,
                metricsPort: 9999,
                type: PodRole.INGEST,
            });

            const [, fields] = podRepository.upsertByPodId.mock.calls[0];
            expect(fields).toMatchObject({ apiPort: 9001, rtspPort: 8555, metricsPort: 9999 });
        });

        it("defaults ports from config when the pod does not report them", async () => {
            podRepository.upsertByPodId.mockResolvedValue(makePod());

            await service.registerPod({ podId: "pod-1", host: "10.0.0.1", type: PodRole.CLUSTER });

            const [, fields] = podRepository.upsertByPodId.mock.calls[0];
            expect(fields).toMatchObject({ apiPort: 9000, rtspPort: 8554, metricsPort: 9998 });
        });

        it("updates lastHeartbeatAt with a recent timestamp", async () => {
            const before = new Date();
            podRepository.upsertByPodId.mockResolvedValue(makePod());

            await service.registerPod({ podId: "pod-1", host: "10.0.0.1", type: PodRole.CLUSTER });

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

            const result = await service.heartbeat({ podId: "pod-1" });

            expect(podRepository.upsertByPodId).toHaveBeenCalledWith(
                "pod-1",
                expect.objectContaining({ status: PodStatus.ACTIVE }),
            );
            expect(result).toBe(pod);
        });

        it("does not emit an event when no resources are reported", async () => {
            podRepository.upsertByPodId.mockResolvedValue(makePod());

            await service.heartbeat({ podId: "pod-1" });

            expect(events.emit).not.toHaveBeenCalled();
        });

        it("emits node.sampled when the heartbeat carries host resources", async () => {
            podRepository.upsertByPodId.mockResolvedValue(makePod());

            await service.heartbeat({
                podId: "pod-1",
                resources: { cpu: 92, memory: 40, disk: 30 },
            });

            expect(events.emit).toHaveBeenCalledWith(
                SystemEventNames.NODE_SAMPLED,
                expect.objectContaining({ podId: "pod-1", cpu: 92 }),
            );
        });
    });
});
