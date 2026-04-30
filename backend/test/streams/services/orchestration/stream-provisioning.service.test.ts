import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { MediaMtxPipelineService } from "@/media-mtx";
import { Stream } from "@/streams";
import { StreamStatus } from "@/common";
import { SystemEventNames } from "@/system-events";

import { StreamCrudService } from "../../../../src/streams/services/mutation/stream-crud.service";
import { StreamProvisioningService } from "../../../../src/streams/services/orchestration/stream-provisioning.service";

const makeStream = (overrides: Partial<Stream> = {}): Stream =>
    ({
        name: "stream-a",
        source: "rtsp://camera/stream-a",
        status: StreamStatus.DISCOVERED,
        isEnabled: true,
        isManual: false,
        metadata: {},
        activeConsumers: 0,
        lastError: null,
        ...overrides,
    }) as Stream;

describe("StreamProvisioningService", () => {
    let service: StreamProvisioningService;
    let streamCrud: jest.Mocked<StreamCrudService>;
    let mediaMtxService: jest.Mocked<MediaMtxPipelineService>;
    let events: jest.Mocked<EventEmitter2>;

    beforeEach(async () => {
        streamCrud = {
            patch: jest.fn(),
        } as unknown as jest.Mocked<StreamCrudService>;
        mediaMtxService = {
            createClusterPullPipeline: jest.fn(),
        } as unknown as jest.Mocked<MediaMtxPipelineService>;
        events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamProvisioningService,
                { provide: StreamCrudService, useValue: streamCrud },
                { provide: MediaMtxPipelineService, useValue: mediaMtxService },
                { provide: EventEmitter2, useValue: events },
            ],
        }).compile();

        service = module.get<StreamProvisioningService>(StreamProvisioningService);
    });

    it("creates the cluster pipeline, patches the stream, and emits STREAM_SYNCED on success", async () => {
        const stream = makeStream();
        const updated = makeStream({ status: StreamStatus.SYNCED, lastSyncedAt: new Date() });
        mediaMtxService.createClusterPullPipeline.mockResolvedValue({} as never);
        streamCrud.patch.mockResolvedValue(updated);

        const result = await service.provisionClusterPipeline(stream);

        expect(mediaMtxService.createClusterPullPipeline).toHaveBeenCalledWith({
            name: stream.name,
            source: stream.source,
            status: stream.status,
        });
        expect(streamCrud.patch).toHaveBeenCalledWith(
            stream.name,
            expect.objectContaining({
                status: StreamStatus.SYNCED,
                lastError: null,
            }),
        );
        expect(result).toBe(updated);
        expect(events.emit).toHaveBeenCalledWith(SystemEventNames.STREAM_SYNCED, updated);
    });

    it("returns the original stream when the success patch returns null", async () => {
        const stream = makeStream();
        mediaMtxService.createClusterPullPipeline.mockResolvedValue({} as never);
        streamCrud.patch.mockResolvedValue(null);

        const result = await service.provisionClusterPipeline(stream);

        expect(result).toBe(stream);
        expect(events.emit).toHaveBeenCalledWith(SystemEventNames.STREAM_SYNCED, stream);
    });

    it("patches a sync error and emits STREAM_SYNC_FAILURE when provisioning throws", async () => {
        const stream = makeStream();
        const errored = makeStream({ status: StreamStatus.SYNC_ERROR, lastError: "boom" });
        mediaMtxService.createClusterPullPipeline.mockRejectedValue(new Error("boom"));
        streamCrud.patch.mockResolvedValue(errored);

        const result = await service.provisionClusterPipeline(stream);

        expect(streamCrud.patch).toHaveBeenCalledWith(
            stream.name,
            expect.objectContaining({
                status: StreamStatus.SYNC_ERROR,
                lastError: "boom",
            }),
        );
        expect(result).toBe(errored);
        expect(events.emit).toHaveBeenCalledWith(SystemEventNames.STREAM_SYNC_FAILURE, {
            stream: stream.name,
            error: "boom",
        });
    });
});
