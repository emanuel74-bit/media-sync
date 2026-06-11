import { Test, TestingModule } from "@nestjs/testing";

import { PodRole } from "@/common";
import { SequentialStreamTaskRunner } from "@/common";
import { ContextualMediaMtxStream, MediaMtxStreamListingService } from "@/infrastructure";
import { MetricCollectionService, MetricCollectionWorkflowService } from "@/metrics/services";

const makeContextualStream = (name: string, role: PodRole): ContextualMediaMtxStream => ({
    stream: { name, source: "rtsp://host/path", status: "ready" },
    context: role,
});

describe("MetricCollectionService", () => {
    let service: MetricCollectionService;
    let mediaMtxListing: jest.Mocked<MediaMtxStreamListingService>;
    let metricWorkflow: jest.Mocked<MetricCollectionWorkflowService>;
    let scheduledWork: jest.Mocked<SequentialStreamTaskRunner>;

    beforeEach(async () => {
        mediaMtxListing = {
            listContextualStreams: jest.fn(),
        } as unknown as jest.Mocked<MediaMtxStreamListingService>;

        metricWorkflow = {
            runStreamMetricWorkflow: jest.fn(),
        } as unknown as jest.Mocked<MetricCollectionWorkflowService>;

        scheduledWork = {
            processSequential: jest.fn(),
        } as unknown as jest.Mocked<SequentialStreamTaskRunner>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MetricCollectionService,
                { provide: MediaMtxStreamListingService, useValue: mediaMtxListing },
                { provide: MetricCollectionWorkflowService, useValue: metricWorkflow },
                { provide: SequentialStreamTaskRunner, useValue: scheduledWork },
            ],
        }).compile();

        service = module.get<MetricCollectionService>(MetricCollectionService);
    });

    it("fetches contextual streams and passes them to processSequential", async () => {
        const streams = [
            makeContextualStream("s1", PodRole.CLUSTER),
            makeContextualStream("s2", PodRole.INGEST),
        ];
        mediaMtxListing.listContextualStreams.mockResolvedValue(streams);
        scheduledWork.processSequential.mockResolvedValue(undefined);

        await service.collectMetrics();

        expect(mediaMtxListing.listContextualStreams).toHaveBeenCalledTimes(1);
        expect(scheduledWork.processSequential).toHaveBeenCalledWith(streams, expect.any(Function));
    });

    it("delegates each listed stream to MetricCollectionWorkflowService.runStreamMetricWorkflow", async () => {
        const stream = makeContextualStream("live", PodRole.CLUSTER);
        mediaMtxListing.listContextualStreams.mockResolvedValue([stream]);
        scheduledWork.processSequential.mockImplementation(async (items, processor) => {
            for (const item of items) {
                await processor(item);
            }
        });
        metricWorkflow.runStreamMetricWorkflow.mockResolvedValue(undefined);

        await service.collectMetrics();

        expect(metricWorkflow.runStreamMetricWorkflow).toHaveBeenCalledWith(
            "live",
            PodRole.CLUSTER,
        );
    });

    it("still hands an empty stream list to the sequential runner", async () => {
        mediaMtxListing.listContextualStreams.mockResolvedValue([]);
        scheduledWork.processSequential.mockResolvedValue(undefined);

        await service.collectMetrics();

        expect(scheduledWork.processSequential).toHaveBeenCalledWith([], expect.any(Function));
    });
});
