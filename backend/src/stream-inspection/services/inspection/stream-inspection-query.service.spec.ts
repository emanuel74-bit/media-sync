import { Test, TestingModule } from "@nestjs/testing";

import { StreamInspectionRecord } from "../../domain";
import { StreamInspectionRepository } from "../../repositories";
import { StreamInspectionQueryService } from "./stream-inspection-query.service";

const makeRecord = (streamName: string): StreamInspectionRecord =>
    ({
        streamName,
        source: "ingest" as never,
        tracks: [],
        metadata: {},
        lastError: null,
        inspectedAt: new Date(),
    }) as unknown as StreamInspectionRecord;

describe("StreamInspectionQueryService", () => {
    let service: StreamInspectionQueryService;
    let repo: jest.Mocked<StreamInspectionRepository>;

    beforeEach(async () => {
        repo = {
            save: jest.fn(),
            findLatest: jest.fn(),
            findHistory: jest.fn(),
            findAllLatest: jest.fn(),
        } as unknown as jest.Mocked<StreamInspectionRepository>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamInspectionQueryService,
                { provide: StreamInspectionRepository, useValue: repo },
            ],
        }).compile();

        service = module.get<StreamInspectionQueryService>(StreamInspectionQueryService);
    });

    describe("findLatest", () => {
        it("delegates to the repository and returns the result", async () => {
            const record = makeRecord("stream-a");
            repo.findLatest.mockResolvedValue(record);

            const result = await service.findLatest("stream-a");

            expect(repo.findLatest).toHaveBeenCalledWith("stream-a");
            expect(result).toBe(record);
        });

        it("returns null when the repository returns null", async () => {
            repo.findLatest.mockResolvedValue(null);

            const result = await service.findLatest("unknown");

            expect(result).toBeNull();
        });
    });

    describe("findHistory", () => {
        it("delegates to the repository with streamName and limit", async () => {
            const records = [makeRecord("stream-b"), makeRecord("stream-b")];
            repo.findHistory.mockResolvedValue(records);

            const result = await service.findHistory("stream-b", 10);

            expect(repo.findHistory).toHaveBeenCalledWith("stream-b", 10);
            expect(result).toBe(records);
        });
    });

    describe("findAllLatest", () => {
        it("delegates to the repository and returns all results", async () => {
            const records = [makeRecord("s1"), makeRecord("s2")];
            repo.findAllLatest.mockResolvedValue(records);

            const result = await service.findAllLatest();

            expect(repo.findAllLatest).toHaveBeenCalledTimes(1);
            expect(result).toBe(records);
        });
    });
});
