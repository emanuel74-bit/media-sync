import { Test, TestingModule } from "@nestjs/testing";

import { StreamStatus } from "@/common";
import { Stream } from "@/streams/domain";
import { StreamQueryService } from "@/streams/services";
import { StreamRepository } from "@/streams/repositories";

const makeStream = (overrides: Partial<Stream> = {}): Stream => ({
    name: "s1",
    source: "rtsp://x",
    status: StreamStatus.SYNCED,
    metadata: {},
    isEnabled: true,
    isManual: false,
    activeConsumers: 0,
    ...overrides,
});

describe("StreamQueryService", () => {
    let service: StreamQueryService;
    let repo: jest.Mocked<StreamRepository>;

    beforeEach(async () => {
        repo = {
            findAll: jest.fn(),
            findByName: jest.fn(),
            findUnassigned: jest.fn(),
            findByAssignedPod: jest.fn(),
            findAssignmentInfo: jest.fn(),
        } as unknown as jest.Mocked<StreamRepository>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [StreamQueryService, { provide: StreamRepository, useValue: repo }],
        }).compile();

        service = module.get<StreamQueryService>(StreamQueryService);
    });

    it("findAll delegates to the repository", async () => {
        const streams = [makeStream()];
        repo.findAll.mockResolvedValue(streams);

        await expect(service.findAll()).resolves.toBe(streams);
    });

    it("findByName delegates to the repository", async () => {
        const stream = makeStream();
        repo.findByName.mockResolvedValue(stream);

        await expect(service.findByName("s1")).resolves.toBe(stream);
        expect(repo.findByName).toHaveBeenCalledWith("s1");
    });

    it("findUnassigned / findByAssignedPod / getAssignmentInfo delegate to the repository", async () => {
        repo.findUnassigned.mockResolvedValue([]);
        repo.findByAssignedPod.mockResolvedValue([]);
        repo.findAssignmentInfo.mockResolvedValue([]);

        await service.findUnassigned();
        await service.findByAssignedPod("pod-1");
        await service.getAssignmentInfo();

        expect(repo.findUnassigned).toHaveBeenCalledTimes(1);
        expect(repo.findByAssignedPod).toHaveBeenCalledWith("pod-1");
        expect(repo.findAssignmentInfo).toHaveBeenCalledTimes(1);
    });
});
