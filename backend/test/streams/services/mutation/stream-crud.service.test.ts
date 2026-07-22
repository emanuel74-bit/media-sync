import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { StreamStatus } from "@/common";
import { Stream } from "@/streams/domain";
import { StreamRepository } from "@/streams/repositories";
import { StreamCrudService, StreamStatusService } from "@/streams/services";

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
    let streamStatus: jest.Mocked<StreamStatusService>;

    beforeEach(async () => {
        repo = {
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            deleteExpiredReservation: jest.fn(),
        } as unknown as jest.Mocked<StreamRepository>;
        streamStatus = {
            transitionTo: jest.fn(),
        } as unknown as jest.Mocked<StreamStatusService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamCrudService,
                { provide: StreamRepository, useValue: repo },
                { provide: StreamStatusService, useValue: streamStatus },
            ],
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

        it("routes status changes through the lifecycle authority", async () => {
            const stream = makeStream({ status: StreamStatus.ASSIGNED, source: "rtsp://y" });
            streamStatus.transitionTo.mockResolvedValue(stream);

            await expect(
                service.update("s1", { status: StreamStatus.ASSIGNED, source: "rtsp://y" }),
            ).resolves.toBe(stream);

            expect(streamStatus.transitionTo).toHaveBeenCalledWith("s1", StreamStatus.ASSIGNED, {
                source: "rtsp://y",
            });
            expect(repo.update).not.toHaveBeenCalled();
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

    describe("expireReservation", () => {
        it("delegates an atomic status-and-expiry guarded delete", async () => {
            const expiredBefore = new Date();
            repo.deleteExpiredReservation.mockResolvedValue(true);

            await expect(service.expireReservation("s1", expiredBefore)).resolves.toBe(true);

            expect(repo.deleteExpiredReservation).toHaveBeenCalledWith("s1", expiredBefore);
        });

        it("reports a concurrent promotion without deleting it", async () => {
            repo.deleteExpiredReservation.mockResolvedValue(false);

            await expect(service.expireReservation("s1", new Date())).resolves.toBe(false);
        });
    });
});
