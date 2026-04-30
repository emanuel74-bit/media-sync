import { Test, TestingModule } from "@nestjs/testing";

import { PodRole } from "@/common";
import { ContextualMediaMtxStream, MediaMtxStreamListingService } from "@/media-mtx";
import { SequentialStreamTaskRunner } from "@/task-sequencing";

import { StreamInspectionRecorderService } from "../../../../src/stream-inspection/services/recording/stream-inspection-recorder.service";
import { StreamInspectionSchedulerService } from "../../../../src/stream-inspection/services/scheduling/stream-inspection-scheduler.service";

const makeContextualStream = (name: string, role: PodRole): ContextualMediaMtxStream => ({
    stream: { name, source: "rtsp://host/path", status: "ready" },
    context: role,
});

describe("StreamInspectionSchedulerService", () => {
    let service: StreamInspectionSchedulerService;
    let listing: jest.Mocked<MediaMtxStreamListingService>;
    let taskRunner: jest.Mocked<SequentialStreamTaskRunner>;
    let recorder: jest.Mocked<StreamInspectionRecorderService>;

    beforeEach(async () => {
        listing = {
            listContextualStreams: jest.fn(),
        } as unknown as jest.Mocked<MediaMtxStreamListingService>;

        taskRunner = {
            processSequential: jest.fn(),
        } as unknown as jest.Mocked<SequentialStreamTaskRunner>;

        recorder = {
            inspectAndRecord: jest.fn(),
        } as unknown as jest.Mocked<StreamInspectionRecorderService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamInspectionSchedulerService,
                { provide: MediaMtxStreamListingService, useValue: listing },
                { provide: SequentialStreamTaskRunner, useValue: taskRunner },
                { provide: StreamInspectionRecorderService, useValue: recorder },
            ],
        }).compile();

        service = module.get<StreamInspectionSchedulerService>(StreamInspectionSchedulerService);
    });

    describe("inspectAllStreams", () => {
        it("fetches contextual streams and passes them to processSequential", async () => {
            const streams = [
                makeContextualStream("s1", PodRole.INGEST),
                makeContextualStream("s2", PodRole.CLUSTER),
            ];
            listing.listContextualStreams.mockResolvedValue(streams);
            taskRunner.processSequential.mockResolvedValue(undefined);

            await service.inspectAllStreams();

            expect(listing.listContextualStreams).toHaveBeenCalledTimes(1);
            expect(taskRunner.processSequential).toHaveBeenCalledWith(
                streams,
                expect.any(Function),
            );
        });

        it("the processor callback delegates to recorder.inspectAndRecord", async () => {
            const stream = makeContextualStream("live", PodRole.CLUSTER);
            listing.listContextualStreams.mockResolvedValue([stream]);
            taskRunner.processSequential.mockImplementation(async (items, processor) => {
                for (const item of items) await processor(item);
            });
            recorder.inspectAndRecord.mockResolvedValue(undefined);

            await service.inspectAllStreams();

            expect(recorder.inspectAndRecord).toHaveBeenCalledWith(stream.stream, PodRole.CLUSTER);
        });

        it("does nothing when there are no streams", async () => {
            listing.listContextualStreams.mockResolvedValue([]);
            taskRunner.processSequential.mockResolvedValue(undefined);

            await service.inspectAllStreams();

            expect(taskRunner.processSequential).toHaveBeenCalledWith([], expect.any(Function));
        });
    });
});
