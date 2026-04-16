import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { StreamMetricProcessor } from "./stream-metric-processor.service";
import { MediaMtxStreamStatsService } from "../../../infrastructure/media-mtx/services";
import { MetricPersistenceService } from "../persistence";
import { StreamFailoverService } from "../failover";
import { PodRole } from "../../../common/domain";
import { SystemEventNames } from "../../../common/events";
import { Metric } from "../../domain";

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

describe("StreamMetricProcessor", () => {
    let service: StreamMetricProcessor;
    let mediaMtxStats: jest.Mocked<MediaMtxStreamStatsService>;
    let metricPersistence: jest.Mocked<MetricPersistenceService>;
    let events: jest.Mocked<EventEmitter2>;
    let streamFailover: jest.Mocked<StreamFailoverService>;

    beforeEach(async () => {
        mediaMtxStats = {
            getStreamStats: jest.fn(),
        } as unknown as jest.Mocked<MediaMtxStreamStatsService>;

        metricPersistence = {
            saveFromStats: jest.fn(),
        } as unknown as jest.Mocked<MetricPersistenceService>;

        events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

        streamFailover = {
            evaluateAndReassignIfDegraded: jest.fn(),
        } as unknown as jest.Mocked<StreamFailoverService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamMetricProcessor,
                { provide: MediaMtxStreamStatsService, useValue: mediaMtxStats },
                { provide: MetricPersistenceService, useValue: metricPersistence },
                { provide: EventEmitter2, useValue: events },
                { provide: StreamFailoverService, useValue: streamFailover },
            ],
        }).compile();

        service = module.get<StreamMetricProcessor>(StreamMetricProcessor);
    });

    describe("processStreamMetric — success path", () => {
        it("fetches stats, persists metric, and emits METRIC_COLLECTED", async () => {
            const stats = { bitrate: 2000 };
            const metric = makeMetric();
            mediaMtxStats.getStreamStats.mockResolvedValue(stats);
            metricPersistence.saveFromStats.mockResolvedValue(metric);
            streamFailover.evaluateAndReassignIfDegraded.mockResolvedValue(undefined);

            await service.processStreamMetric("live", PodRole.CLUSTER);

            expect(mediaMtxStats.getStreamStats).toHaveBeenCalledWith(PodRole.CLUSTER, "live");
            expect(metricPersistence.saveFromStats).toHaveBeenCalledWith(
                "live",
                PodRole.CLUSTER,
                stats,
            );
            expect(events.emit).toHaveBeenCalledWith(SystemEventNames.METRIC_COLLECTED, {
                streamName: "live",
                metric,
            });
        });

        it("calls failover evaluation for CLUSTER role", async () => {
            const metric = makeMetric();
            mediaMtxStats.getStreamStats.mockResolvedValue({});
            metricPersistence.saveFromStats.mockResolvedValue(metric);
            streamFailover.evaluateAndReassignIfDegraded.mockResolvedValue(undefined);

            await service.processStreamMetric("live", PodRole.CLUSTER);

            expect(streamFailover.evaluateAndReassignIfDegraded).toHaveBeenCalledWith(
                "live",
                metric,
            );
        });

        it("skips failover evaluation for INGEST role", async () => {
            mediaMtxStats.getStreamStats.mockResolvedValue({});
            metricPersistence.saveFromStats.mockResolvedValue(makeMetric());

            await service.processStreamMetric("live", PodRole.INGEST);

            expect(streamFailover.evaluateAndReassignIfDegraded).not.toHaveBeenCalled();
        });
    });

    describe("processStreamMetric — error path", () => {
        it("catches errors and does not rethrow", async () => {
            mediaMtxStats.getStreamStats.mockRejectedValue(new Error("network error"));

            await expect(
                service.processStreamMetric("live", PodRole.CLUSTER),
            ).resolves.toBeUndefined();
        });

        it("does not persist metric when stats fetch fails", async () => {
            mediaMtxStats.getStreamStats.mockRejectedValue(new Error("timeout"));

            await service.processStreamMetric("live", PodRole.INGEST);

            expect(metricPersistence.saveFromStats).not.toHaveBeenCalled();
            expect(events.emit).not.toHaveBeenCalled();
        });
    });
});
