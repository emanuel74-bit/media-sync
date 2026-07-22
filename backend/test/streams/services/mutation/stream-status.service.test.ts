import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { StreamStatus } from "@/common";
import { Stream } from "@/streams/domain";
import { StreamStatusService } from "@/streams/services";
import { StreamRepository } from "@/streams/repositories";

const makeStream = (overrides: Partial<Stream> = {}): Stream => ({
    name: "s1",
    source: "rtsp://x",
    status: StreamStatus.DISCOVERED,
    metadata: {},
    isEnabled: true,
    isManual: false,
    activeConsumers: 0,
    ...overrides,
});

describe("StreamStatusService", () => {
    let service: StreamStatusService;
    let repo: jest.Mocked<StreamRepository>;

    beforeEach(async () => {
        repo = {
            upsert: jest.fn(),
            update: jest.fn(),
        } as unknown as jest.Mocked<StreamRepository>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [StreamStatusService, { provide: StreamRepository, useValue: repo }],
        }).compile();

        service = module.get<StreamStatusService>(StreamStatusService);
    });

    it("upsertFromDiscovery upserts with isManual: false", async () => {
        const stream = makeStream();
        repo.upsert.mockResolvedValue(stream);

        const result = await service.upsertFromDiscovery({ name: "s1", source: "rtsp://x" });

        expect(result).toBe(stream);
        expect(repo.upsert).toHaveBeenCalledWith("s1", {
            name: "s1",
            source: "rtsp://x",
            isManual: false,
        });
    });

    it("markStale sets STALE status and lastSeenAt", async () => {
        repo.update.mockResolvedValue(makeStream({ status: StreamStatus.STALE }));

        await service.markStale("s1");

        expect(repo.update).toHaveBeenCalledWith("s1", {
            status: StreamStatus.STALE,
            lastSeenAt: expect.any(Date),
        });
    });

    it("markSynced sets SYNCED, refreshes lastSyncedAt, and clears lastError", async () => {
        const synced = makeStream({ status: StreamStatus.SYNCED });
        repo.update.mockResolvedValue(synced);

        await expect(service.markSynced("s1")).resolves.toBe(synced);
        expect(repo.update).toHaveBeenCalledWith("s1", {
            status: StreamStatus.SYNCED,
            lastSyncedAt: expect.any(Date),
            lastError: null,
        });
    });

    it("markSyncError sets SYNC_ERROR with the error message", async () => {
        repo.update.mockResolvedValue(makeStream({ status: StreamStatus.SYNC_ERROR }));

        await service.markSyncError("s1", "pull failed");

        expect(repo.update).toHaveBeenCalledWith("s1", {
            status: StreamStatus.SYNC_ERROR,
            lastError: "pull failed",
        });
    });

    it("markPendingAssignment sets PENDING_ASSIGNMENT with the reason", async () => {
        repo.update.mockResolvedValue(makeStream({ status: StreamStatus.PENDING_ASSIGNMENT }));

        await service.markPendingAssignment("s1", "no nodes");

        expect(repo.update).toHaveBeenCalledWith("s1", {
            status: StreamStatus.PENDING_ASSIGNMENT,
            lastError: "no nodes",
        });
    });

    it("throws NotFound when the stream no longer exists (transition target gone)", async () => {
        repo.update.mockResolvedValue(null);

        await expect(service.markSynced("gone")).rejects.toBeInstanceOf(NotFoundException);
        await expect(service.markSyncError("gone", "x")).rejects.toBeInstanceOf(NotFoundException);
        await expect(service.markPendingAssignment("gone", "x")).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });
});
