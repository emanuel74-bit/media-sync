import { Test, TestingModule } from "@nestjs/testing";

import { NodeRole } from "@/common";
import { StreamInspectionRecord } from "@/stream-inspection/domain";
import { StreamInspectionQueryService } from "@/stream-inspection/services";
import { StreamInspectionController } from "@/stream-inspection/controllers";

const makeInspectionRecord = (
    overrides: Partial<StreamInspectionRecord> = {},
): StreamInspectionRecord => ({
    streamName: "stream-1",
    source: NodeRole.INGEST,
    tracks: [],
    metadata: {},
    lastError: null,
    inspectedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe("StreamInspectionController", () => {
    let controller: StreamInspectionController;
    let streamInspection: jest.Mocked<StreamInspectionQueryService>;

    beforeEach(async () => {
        streamInspection = {
            findAllLatest: jest.fn(),
            findLatest: jest.fn(),
            findHistory: jest.fn(),
        } as unknown as jest.Mocked<StreamInspectionQueryService>;

        const module: TestingModule = await Test.createTestingModule({
            controllers: [StreamInspectionController],
            providers: [{ provide: StreamInspectionQueryService, useValue: streamInspection }],
        }).compile();

        controller = module.get<StreamInspectionController>(StreamInspectionController);
    });

    it("delegates getAllLatestInspections to StreamInspectionQueryService.findAllLatest", async () => {
        const records = [makeInspectionRecord()];
        streamInspection.findAllLatest.mockResolvedValue(records);

        const result = await controller.getAllLatestInspections();

        expect(result).toBe(records);
        expect(streamInspection.findAllLatest).toHaveBeenCalledTimes(1);
    });

    it("delegates getLatestInspection to StreamInspectionQueryService.findLatest", async () => {
        const record = makeInspectionRecord();
        streamInspection.findLatest.mockResolvedValue(record);

        const result = await controller.getLatestInspection("stream-1");

        expect(result).toBe(record);
        expect(streamInspection.findLatest).toHaveBeenCalledWith("stream-1");
    });

    it("delegates getInspectionHistory to StreamInspectionQueryService.findHistory", async () => {
        const records = [makeInspectionRecord()];
        streamInspection.findHistory.mockResolvedValue(records);

        const result = await controller.getInspectionHistory("stream-1", 5);

        expect(result).toBe(records);
        expect(streamInspection.findHistory).toHaveBeenCalledWith("stream-1", 5);
    });
});
