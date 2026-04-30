import { Stream } from "@/streams";

import { StreamAssignmentService } from "../../../../src/streams/services/assignment/stream-assignment.service";
import { StreamStatusService } from "../../../../src/streams/services/mutation/stream-status.service";
import { StreamProvisioningService } from "../../../../src/streams/services/orchestration/stream-provisioning.service";
import { StreamQueryService } from "../../../../src/streams/services/query/stream-query.service";
import { StreamsFacadeService } from "../../../../src/streams/services/external/streams-facade.service";

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

describe("StreamsFacadeService", () => {
    let service: StreamsFacadeService;
    let streamQuery: jest.Mocked<StreamQueryService>;
    let streamStatus: jest.Mocked<StreamStatusService>;
    let streamAssignment: jest.Mocked<StreamAssignmentService>;
    let streamProvisioning: jest.Mocked<StreamProvisioningService>;

    beforeEach(() => {
        streamQuery = {
            findAll: jest.fn(),
            findByName: jest.fn(),
            findAssignedByName: jest.fn(),
        } as unknown as jest.Mocked<StreamQueryService>;
        streamStatus = {
            upsertFromDiscovery: jest.fn(),
            markStale: jest.fn(),
        } as unknown as jest.Mocked<StreamStatusService>;
        streamAssignment = {
            ensureAssigned: jest.fn(),
            reassign: jest.fn(),
        } as unknown as jest.Mocked<StreamAssignmentService>;
        streamProvisioning = {
            provisionClusterPipeline: jest.fn(),
        } as unknown as jest.Mocked<StreamProvisioningService>;

        service = new StreamsFacadeService(
            streamQuery,
            streamStatus,
            streamAssignment,
            streamProvisioning,
        );
    });

    it("delegates query methods to StreamQueryService", async () => {
        const stream = makeStream({ assignedPod: "pod-1" });
        streamQuery.findAll.mockResolvedValue([stream]);
        streamQuery.findByName.mockResolvedValue(stream);
        streamQuery.findAssignedByName.mockResolvedValue(stream);

        await expect(service.findAll()).resolves.toEqual([stream]);
        await expect(service.findByName(stream.name)).resolves.toBe(stream);
        await expect(service.findAssignedByName(stream.name)).resolves.toBe(stream);
    });

    it("delegates discovery and staleness mutations to StreamStatusService", async () => {
        const stream = makeStream();
        streamStatus.upsertFromDiscovery.mockResolvedValue(stream);
        streamStatus.markStale.mockResolvedValue(undefined);

        await expect(service.upsertFromDiscovery({ name: stream.name })).resolves.toBe(stream);
        await expect(service.markStale(stream.name)).resolves.toBeUndefined();

        expect(streamStatus.markStale).toHaveBeenCalledWith(stream.name);
    });

    it("delegates assignment and provisioning to the underlying services", async () => {
        const stream = makeStream({ assignedPod: "pod-2" });
        streamAssignment.ensureAssigned.mockResolvedValue(stream);
        streamAssignment.reassign.mockResolvedValue(stream);
        streamProvisioning.provisionClusterPipeline.mockResolvedValue(stream);

        await expect(service.ensureAssigned(stream.name, ["pod-1", "pod-2"])).resolves.toBe(stream);
        await expect(service.reassign(stream.name, ["pod-2", "pod-3"])).resolves.toBe(stream);
        await expect(service.provisionClusterPipeline(stream)).resolves.toBe(stream);
    });
});
