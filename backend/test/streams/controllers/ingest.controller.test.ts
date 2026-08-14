import { Test, TestingModule } from "@nestjs/testing";

import { StreamReservation } from "@/streams/domain";
import { IngestController } from "@/streams/controllers";
import { StreamReservationService } from "@/streams/services";

describe("IngestController", () => {
    let controller: IngestController;
    let reservations: jest.Mocked<StreamReservationService>;

    beforeEach(async () => {
        reservations = {
            reserve: jest.fn(),
        } as unknown as jest.Mocked<StreamReservationService>;

        const module: TestingModule = await Test.createTestingModule({
            controllers: [IngestController],
            providers: [{ provide: StreamReservationService, useValue: reservations }],
        }).compile();

        controller = module.get<IngestController>(IngestController);
    });

    it("returns the reservation token and a publish URL containing the same credential", async () => {
        const reservation: StreamReservation = {
            name: "stream-1",
            ingestNode: "ingest-1",
            publishUrl: "rtsp://publish:reservation-secret@ingest.example:8554/stream-1",
            publishToken: "reservation-secret",
            expiresAt: new Date("2026-08-14T12:00:00.000Z"),
        };
        reservations.reserve.mockResolvedValue(reservation);

        const result = await controller.reserve({ name: "stream-1" });

        expect(result).toBe(reservation);
        expect(result.publishToken).toBe("reservation-secret");
        expect(result.publishUrl).toContain(`:${result.publishToken}@`);
        expect(reservations.reserve).toHaveBeenCalledWith("stream-1");
    });
});
