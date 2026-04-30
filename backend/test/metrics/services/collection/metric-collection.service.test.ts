import { Test, TestingModule } from "@nestjs/testing";

import { PodRole } from "@/common";
import { MediaMtxStreamListingService } from "@/media-mtx";
import { SequentialStreamTaskRunner } from "@/task-sequencing";

import { MetricCollectionService } from "../../../../src/metrics/services/collection/metric-collection.service";
import { StreamMetricProcessor } from "../../../../src/metrics/services/collection/stream-metric-processor.service";

type ContextualStream = {
    stream: { name: string };
    context: PodRole;
};

const makeContextualStreams = (): ContextualStream[] => [
    { stream: { name: "stream-a" }, context: PodRole.INGEST },
    { stream: { name: "stream-b" }, context: PodRole.CLUSTER },
];

describe("MetricCollectionService", () => {
    let service: MetricCollectionService;
    let mediaMtxListing: jest.Mocked<MediaMtxStreamListingService>;
    let metricProcessor: jest.Mocked<StreamMetricProcessor>;
    let scheduledWork: jest.Mocked<SequentialStreamTaskRunner>;

    beforeEach(async () => {
        mediaMtxListing = {
            listContextualStreams: jest.fn(),
        } as unknown as jest.Mocked<MediaMtxStreamListingService>;
        metricProcessor = {
            processStreamMetric: jest.fn(),
        } as unknown as jest.Mocked<StreamMetricProcessor>;
        scheduledWork = {
            processSequential: jest.fn(),
        } as unknown as jest.Mocked<SequentialStreamTaskRunner>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MetricCollectionService,
                { provide: MediaMtxStreamListingService, useValue: mediaMtxListing },
                { provide: StreamMetricProcessor, useValue: metricProcessor },
                { provide: SequentialStreamTaskRunner, useValue: scheduledWork },
            ],
        }).compile();

        service = module.get<MetricCollectionService>(MetricCollectionService);
    });

    it("loads contextual streams before scheduling work", async () => {
        const streams = makeContextualStreams();
        mediaMtxListing.listContextualStreams.mockResolvedValue(streams as never);
        scheduledWork.processSequential.mockResolvedValue(undefined);

        await service.collectMetrics();

        expect(mediaMtxListing.listContextualStreams).toHaveBeenCalled();
        expect(scheduledWork.processSequential).toHaveBeenCalledWith(streams, expect.any(Function));
    });

    it("invokes the metric processor for each stream-context pair via the sequential runner callback", async () => {
        const streams = makeContextualStreams();
        mediaMtxListing.listContextualStreams.mockResolvedValue(streams as never);
        scheduledWork.processSequential.mockImplementation(async (items, handler) => {
            for (const item of items as unknown as ContextualStream[]) {
                await handler(item as never);
            }
        });
        metricProcessor.processStreamMetric.mockResolvedValue(undefined);

        await service.collectMetrics();

        expect(metricProcessor.processStreamMetric).toHaveBeenNthCalledWith(
            1,
            "stream-a",
            PodRole.INGEST,
        );
        expect(metricProcessor.processStreamMetric).toHaveBeenNthCalledWith(
            2,
            "stream-b",
            PodRole.CLUSTER,
        );
    });

    it("still delegates through the sequential runner when there are no streams", async () => {
        mediaMtxListing.listContextualStreams.mockResolvedValue([] as never);
        scheduledWork.processSequential.mockResolvedValue(undefined);

        await service.collectMetrics();

        expect(scheduledWork.processSequential).toHaveBeenCalledWith([], expect.any(Function));
        expect(metricProcessor.processStreamMetric).not.toHaveBeenCalled();
    });
});