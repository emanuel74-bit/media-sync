import { NotFoundException } from "@nestjs/common";

import { Stream } from "@/streams";
import { StreamAssignmentInfo } from "@/streams";

import { StreamRepository } from "../../../../src/streams/repositories/stream.repository";
import { StreamQueryService } from "../../../../src/streams/services/query/stream-query.service";

const makeStream = (overrides: Partial<Stream> = {}): Stream =>
    ({
        name: "stream-a",
        source: "rtsp://camera/stream-a",
        status: "ready",
        assignedPod: null,
        isEnabled: true,
        isManual: false,
        metadata: {},
        activeConsumers: 0,
        lastError: null,
        ...overrides,
    }) as Stream;

describe("StreamQueryService", () => {
    let service: StreamQueryService;
    let streamRepository: jest.Mocked<StreamRepository>;

    beforeEach(() => {
        streamRepository = {
            findAll: jest.fn(),
            findByName: jest.fn(),
            findUnassigned: jest.fn(),
            findByAssignedPod: jest.fn(),
            getAssignmentInfo: jest.fn(),
        } as unknown as jest.Mocked<StreamRepository>;

        service = new StreamQueryService(streamRepository);
    });

    it("returns the repository result from findByName", async () => {
        const stream = makeStream();
        streamRepository.findByName.mockResolvedValue(stream);

        await expect(service.findByName("stream-a")).resolves.toBe(stream);
    });

    it("throws NotFoundException when findRequiredByName cannot find a stream", async () => {
        streamRepository.findByName.mockResolvedValue(null);

        await expect(service.findRequiredByName("missing")).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it("returns null from findAssignedByName when the stream has no assigned pod", async () => {
        streamRepository.findByName.mockResolvedValue(makeStream({ assignedPod: null }));

        await expect(service.findAssignedByName("stream-a")).resolves.toBeNull();
    });

    it("returns the stream from findAssignedByName when assignedPod is set", async () => {
        const stream = makeStream({ assignedPod: "pod-1" });
        streamRepository.findByName.mockResolvedValue(stream);

        await expect(service.findAssignedByName("stream-a")).resolves.toBe(stream);
    });

    it("passes assignment info through from the repository", async () => {
        const info = [
            { streamName: "stream-a", assignedPod: "pod-1" },
        ] as unknown as StreamAssignmentInfo[];
        streamRepository.getAssignmentInfo.mockResolvedValue(info);

        await expect(service.getAssignmentInfo()).resolves.toBe(info);
    });
});
