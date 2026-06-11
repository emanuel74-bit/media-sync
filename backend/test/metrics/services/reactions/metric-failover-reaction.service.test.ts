import { Test, TestingModule } from "@nestjs/testing";

import { PodRole } from "@/common";
import { Metric } from "@/metrics/domain";
import { StreamFailoverService } from "@/metrics/services";
import { MetricFailoverReactionService } from "@/metrics/services/reactions/metric-failover-reaction.service";

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

describe("MetricFailoverReactionService", () => {
    let service: MetricFailoverReactionService;
    let streamFailover: jest.Mocked<StreamFailoverService>;

    beforeEach(async () => {
        streamFailover = {
            evaluateAndReassignIfDegraded: jest.fn(),
        } as unknown as jest.Mocked<StreamFailoverService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MetricFailoverReactionService,
                { provide: StreamFailoverService, useValue: streamFailover },
            ],
        }).compile();

        service = module.get<MetricFailoverReactionService>(MetricFailoverReactionService);
    });

    it("delegates CLUSTER metrics to StreamFailoverService", async () => {
        const metric = makeMetric();
        streamFailover.evaluateAndReassignIfDegraded.mockResolvedValue(undefined);

        await service.handleCollectedMetric("live", PodRole.CLUSTER, metric);

        expect(streamFailover.evaluateAndReassignIfDegraded).toHaveBeenCalledWith("live", metric);
    });

    it("skips non-CLUSTER metrics", async () => {
        await service.handleCollectedMetric("live", PodRole.INGEST, makeMetric());

        expect(streamFailover.evaluateAndReassignIfDegraded).not.toHaveBeenCalled();
    });
});
