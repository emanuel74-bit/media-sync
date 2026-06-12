import { Test, TestingModule } from "@nestjs/testing";

import { PodRole } from "@/common";
import { Metric } from "@/metrics/domain";
import { MediaMtxStreamStatsService } from "@/infrastructure";
import { MetricPersistenceService } from "@/metrics/services";
import { StreamMetricCollectorService } from "@/metrics/services/collection/stream-metric-collector.service";

const makeMetric = (): Metric => ({
    streamName: "live",
    context: PodRole.CLUSTER,
    bitrate: 2000,
    fps: 30,
    latency: 50,
    jitter: 1,
    packetLoss: 0,
    consumers: 3,
});

describe("StreamMetricCollectorService", () => {
    let service: StreamMetricCollectorService;
    let mediaMtxStats: jest.Mocked<MediaMtxStreamStatsService>;
    let metricPersistence: jest.Mocked<MetricPersistenceService>;

    beforeEach(async () => {
        mediaMtxStats = {
            getStreamStats: jest.fn(),
        } as unknown as jest.Mocked<MediaMtxStreamStatsService>;

        metricPersistence = {
            saveFromStats: jest.fn(),
        } as unknown as jest.Mocked<MetricPersistenceService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamMetricCollectorService,
                { provide: MediaMtxStreamStatsService, useValue: mediaMtxStats },
                { provide: MetricPersistenceService, useValue: metricPersistence },
            ],
        }).compile();

        service = module.get<StreamMetricCollectorService>(StreamMetricCollectorService);
    });

    it("fetches stats and persists the collected metric", async () => {
        const stats = { bitrate: 2000 };
        const metric = makeMetric();
        mediaMtxStats.getStreamStats.mockResolvedValue(stats);
        metricPersistence.saveFromStats.mockResolvedValue(metric);

        const result = await service.collectStreamMetric("live", PodRole.CLUSTER);

        expect(result).toBe(metric);
        expect(mediaMtxStats.getStreamStats).toHaveBeenCalledWith(PodRole.CLUSTER, "live");
        expect(metricPersistence.saveFromStats).toHaveBeenCalledWith(
            "live",
            PodRole.CLUSTER,
            stats,
        );
    });

    it("lets upstream callers handle collection failures", async () => {
        mediaMtxStats.getStreamStats.mockRejectedValue(new Error("timeout"));

        await expect(service.collectStreamMetric("live", PodRole.CLUSTER)).rejects.toThrow(
            "timeout",
        );

        expect(metricPersistence.saveFromStats).not.toHaveBeenCalled();
    });
});
