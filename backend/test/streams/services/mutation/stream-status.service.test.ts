import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, NotFoundException } from "@nestjs/common";

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
            findByName: jest.fn(),
            transitionStatus: jest.fn(),
            upsert: jest.fn(),
        } as unknown as jest.Mocked<StreamRepository>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [StreamStatusService, { provide: StreamRepository, useValue: repo }],
        }).compile();

        service = module.get<StreamStatusService>(StreamStatusService);
    });

    it("records discovery data without persisting MediaMTX's wire status", async () => {
        const synced = makeStream({ status: StreamStatus.SYNCED });
        repo.findByName.mockResolvedValue(synced);
        repo.upsert.mockResolvedValue(synced);

        const result = await service.upsertFromDiscovery({
            name: "s1",
            source: "rtsp://x",
            status: "ready" as StreamStatus,
        });

        expect(result).toBe(synced);
        expect(repo.upsert).toHaveBeenCalledWith("s1", {
            name: "s1",
            source: "rtsp://x",
            isManual: false,
            reservedUntil: null,
            publishToken: null,
        });
    });

    it("moves a reservation to DISCOVERED and clears its publish secret", async () => {
        const reserved = makeStream({
            status: StreamStatus.RESERVED,
            publishToken: "secret",
            reservedUntil: new Date(),
        });
        const discovered = makeStream();
        repo.findByName.mockResolvedValue(reserved);
        repo.transitionStatus.mockResolvedValue(discovered);

        await expect(service.upsertFromDiscovery({ name: "s1" })).resolves.toBe(discovered);

        expect(repo.transitionStatus).toHaveBeenCalledWith("s1", StreamStatus.RESERVED, {
            name: "s1",
            isManual: false,
            reservedUntil: null,
            publishToken: null,
            lastError: null,
            status: StreamStatus.DISCOVERED,
        });
    });

    it("normalizes a legacy MediaMTX wire status already persisted in the database", async () => {
        const legacy = makeStream({ status: "ready" as StreamStatus });
        const discovered = makeStream();
        repo.findByName.mockResolvedValue(legacy);
        repo.transitionStatus.mockResolvedValue(discovered);

        await expect(service.upsertFromDiscovery({ name: "s1" })).resolves.toBe(discovered);

        expect(repo.transitionStatus).toHaveBeenCalledWith(
            "s1",
            "ready",
            expect.objectContaining({ status: StreamStatus.DISCOVERED }),
        );
    });

    it("does not regress a state advanced by a concurrent discovery worker", async () => {
        const reserved = makeStream({ status: StreamStatus.RESERVED });
        const synced = makeStream({ status: StreamStatus.SYNCED });
        repo.findByName.mockResolvedValue(reserved);
        repo.transitionStatus.mockResolvedValue(null);
        repo.upsert.mockResolvedValue(synced);

        await expect(service.upsertFromDiscovery({ name: "s1" })).resolves.toBe(synced);

        expect(repo.upsert).toHaveBeenCalledWith("s1", {
            name: "s1",
            isManual: false,
            reservedUntil: null,
            publishToken: null,
        });
    });

    it("atomically applies an allowed transition", async () => {
        const assigned = makeStream({ status: StreamStatus.ASSIGNED });
        const synced = makeStream({ status: StreamStatus.SYNCED });
        repo.findByName.mockResolvedValue(assigned);
        repo.transitionStatus.mockResolvedValue(synced);

        await expect(service.markSynced("s1")).resolves.toBe(synced);

        expect(repo.transitionStatus).toHaveBeenCalledWith("s1", StreamStatus.ASSIGNED, {
            status: StreamStatus.SYNCED,
            lastSyncedAt: expect.any(Date),
            lastError: null,
        });
    });

    it("allows an idempotent same-state update", async () => {
        const synced = makeStream({ status: StreamStatus.SYNCED });
        repo.findByName.mockResolvedValue(synced);
        repo.transitionStatus.mockResolvedValue(synced);

        await expect(service.markSynced("s1")).resolves.toBe(synced);

        expect(repo.transitionStatus).toHaveBeenCalledWith(
            "s1",
            StreamStatus.SYNCED,
            expect.objectContaining({ status: StreamStatus.SYNCED }),
        );
    });

    it("rejects an illegal lifecycle jump", async () => {
        repo.findByName.mockResolvedValue(makeStream({ status: StreamStatus.RESERVED }));

        await expect(service.markSynced("s1")).rejects.toBeInstanceOf(ConflictException);

        expect(repo.transitionStatus).not.toHaveBeenCalled();
    });

    it("retries once when a concurrent transition wins the compare-and-set", async () => {
        const discovered = makeStream({ status: StreamStatus.DISCOVERED });
        const assigned = makeStream({ status: StreamStatus.ASSIGNED });
        const stale = makeStream({ status: StreamStatus.STALE });
        repo.findByName.mockResolvedValueOnce(discovered).mockResolvedValueOnce(assigned);
        repo.transitionStatus.mockResolvedValueOnce(null).mockResolvedValueOnce(stale);

        await expect(service.transitionTo("s1", StreamStatus.STALE)).resolves.toBe(stale);

        expect(repo.transitionStatus).toHaveBeenNthCalledWith(1, "s1", StreamStatus.DISCOVERED, {
            status: StreamStatus.STALE,
        });
        expect(repo.transitionStatus).toHaveBeenNthCalledWith(2, "s1", StreamStatus.ASSIGNED, {
            status: StreamStatus.STALE,
        });
    });

    it("throws NotFound when the transition target does not exist", async () => {
        repo.findByName.mockResolvedValue(null);

        await expect(service.markSynced("gone")).rejects.toBeInstanceOf(NotFoundException);
    });
});
