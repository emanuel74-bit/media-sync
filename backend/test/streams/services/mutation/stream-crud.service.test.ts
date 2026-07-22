import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { StreamStatus } from "@/common";
import { Stream } from "@/streams/domain";
import { StreamCrudService } from "@/streams/services";
import { StreamRepository } from "@/streams/repositories";

const makeStream = (overrides: Partial<Stream> = {}): Stream => ({
    name: "s1",
    source: "rtsp://x",
    status: StreamStatus.CREATED,
    metadata: {},
    isEnabled: true,
    isManual: true,
    activeConsumers: 0,
    ...overrides,
});

describe("StreamCrudService", () => {
    let service: StreamCrudService;
    let repo: jest.Mocked<StreamRepository>;

    beforeEach(async () => {
        repo = {
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        } as unknown as jest.Mocked<StreamRepository>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [StreamCrudService, { provide: StreamRepository, useValue: repo }],
        }).compile();

        service = module.get<StreamCrudService>(StreamCrudService);
    });

    describe("create", () => {
        it("creates a manual stream with CREATED status and sane defaults", async () => {
            const stream = makeStream();
            repo.create.mockResolvedValue(stream);

            const result = await service.create({ name: "s1", source: "rtsp://x" });

            expect(result).toBe(stream);
            expect(repo.create).toHaveBeenCalledWith({
                name: "s1",
                source: "rtsp://x",
                isEnabled: true,
                isManual: true,
                status: StreamStatus.CREATED,
                lastError: null,
                metadata: {},
                activeConsumers: 0,
            });
        });

        it("honors an explicit isEnabled: false", async () => {
            repo.create.mockResolvedValue(makeStream({ isEnabled: false }));

            await service.create({ name: "s1", source: "rtsp://x", isEnabled: false });

            expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ isEnabled: false }));
        });
    });

    describe("update", () => {
        it("returns the updated stream", async () => {
            const stream = makeStream({ source: "rtsp://y" });
            repo.update.mockResolvedValue(stream);

            await expect(service.update("s1", { source: "rtsp://y" })).resolves.toBe(stream);
        });

        it("throws NotFound when the stream does not exist", async () => {
            repo.update.mockResolvedValue(null);

            await expect(service.update("missing", {})).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe("remove", () => {
        it("resolves when the repository deletes the stream", async () => {
            repo.delete.mockResolvedValue(true);

            await expect(service.remove("s1")).resolves.toBeUndefined();
        });

        it("throws NotFound when nothing was deleted", async () => {
            repo.delete.mockResolvedValue(false);

            await expect(service.remove("missing")).rejects.toBeInstanceOf(NotFoundException);
        });
    });
});
