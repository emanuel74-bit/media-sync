import { ConflictException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { ConfigService } from "@/config";
import { Stream } from "@/streams/domain";
import { SystemEventNames } from "@/common";
import { NodeResolver } from "@/media-nodes";
import {
    IngestPlacementService,
    StreamCrudService,
    StreamQueryService,
    StreamReservationService,
} from "@/streams/services";

describe("StreamReservationService", () => {
    let service: StreamReservationService;
    let streamQuery: jest.Mocked<StreamQueryService>;
    let streamCrud: jest.Mocked<StreamCrudService>;
    let ingestPlacement: jest.Mocked<IngestPlacementService>;
    let nodes: jest.Mocked<NodeResolver>;
    let events: jest.Mocked<EventEmitter2>;

    beforeEach(async () => {
        streamQuery = {
            findByName: jest.fn().mockResolvedValue(null),
        } as unknown as jest.Mocked<StreamQueryService>;
        streamCrud = {
            createReservation: jest.fn(),
        } as unknown as jest.Mocked<StreamCrudService>;
        ingestPlacement = {
            selectNode: jest.fn(),
        } as unknown as jest.Mocked<IngestPlacementService>;
        nodes = {
            getIngestRtspUrl: jest.fn(),
        } as unknown as jest.Mocked<NodeResolver>;
        events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamReservationService,
                { provide: StreamQueryService, useValue: streamQuery },
                { provide: StreamCrudService, useValue: streamCrud },
                { provide: IngestPlacementService, useValue: ingestPlacement },
                { provide: NodeResolver, useValue: nodes },
                {
                    provide: ConfigService,
                    useValue: { ingestReservationTtlMs: 300_000, ingestPublishUser: "publish" },
                },
                { provide: EventEmitter2, useValue: events },
            ],
        }).compile();

        service = module.get(StreamReservationService);
    });

    it("rejects a name that already exists", async () => {
        streamQuery.findByName.mockResolvedValue({ name: "s1" } as Stream);

        await expect(service.reserve("s1")).rejects.toBeInstanceOf(ConflictException);
        expect(ingestPlacement.selectNode).not.toHaveBeenCalled();
        expect(streamCrud.createReservation).not.toHaveBeenCalled();
    });

    it("propagates a placement failure without creating a reservation", async () => {
        ingestPlacement.selectNode.mockRejectedValue(new Error("No active ingest nodes available"));

        await expect(service.reserve("cam")).rejects.toThrow("No active ingest nodes");
        expect(streamCrud.createReservation).not.toHaveBeenCalled();
    });

    it("reserves a slot on the placed node, mints a secret, and creates a RESERVED stream", async () => {
        const before = Date.now();
        ingestPlacement.selectNode.mockResolvedValue("ingest-b");
        nodes.getIngestRtspUrl.mockResolvedValue("rtsp://10.0.0.1:8554/cam");

        const result = await service.reserve("cam");

        expect(nodes.getIngestRtspUrl).toHaveBeenCalledWith("ingest-b", "cam");
        expect(result.ingestPod).toBe("ingest-b");
        expect(result.publishToken).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(result.publishUrl).toBe(`rtsp://publish:${result.publishToken}@10.0.0.1:8554/cam`);
        expect(streamCrud.createReservation).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "cam",
                source: "rtsp://10.0.0.1:8554/cam",
                ingestPod: "ingest-b",
                publishToken: result.publishToken,
            }),
        );
        const created = streamCrud.createReservation.mock.calls[0][0];
        expect(created.reservedUntil.getTime()).toBeGreaterThanOrEqual(before + 300_000);
        expect(events.emit).toHaveBeenCalledWith(SystemEventNames.STREAM_RESERVED, {
            streamName: "cam",
            ingestPod: "ingest-b",
            expiresAt: result.expiresAt,
        });
    });
});
