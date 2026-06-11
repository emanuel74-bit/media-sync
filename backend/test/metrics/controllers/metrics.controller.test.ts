import { Test, TestingModule } from "@nestjs/testing";

import { PodRole } from "@/common";
import { Metric } from "@/metrics/domain";
import { MetricsController } from "@/metrics/controllers";
import { MetricPersistenceService } from "@/metrics/services";

const makeMetric = (overrides: Partial<Metric> = {}): Metric => ({
    streamName: "stream-1",
    context: PodRole.CLUSTER,
    bitrate: 1000,
    fps: 30,
    latency: 10,
    jitter: 1,
    packetLoss: 0,
    consumers: 2,
    createdAt: new Date(),
    ...overrides,
});

describe("MetricsController", () => {
    let controller: MetricsController;
    let metricPersistence: jest.Mocked<MetricPersistenceService>;

    beforeEach(async () => {
        metricPersistence = {
            findRecent: jest.fn(),
        } as unknown as jest.Mocked<MetricPersistenceService>;

        const module: TestingModule = await Test.createTestingModule({
            controllers: [MetricsController],
            providers: [{ provide: MetricPersistenceService, useValue: metricPersistence }],
        }).compile();

        controller = module.get<MetricsController>(MetricsController);
    });

    it("delegates stream metrics lookup with the resolved limit", async () => {
        const metrics = [makeMetric()];
        metricPersistence.findRecent.mockResolvedValue(metrics);

        const result = await controller.streamMetrics("stream-1", 25);

        expect(result).toBe(metrics);
        expect(metricPersistence.findRecent).toHaveBeenCalledWith("stream-1", 25);
    });
});
