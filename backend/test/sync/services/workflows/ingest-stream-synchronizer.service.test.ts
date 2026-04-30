import { Test, TestingModule } from "@nestjs/testing";

import { Stream } from "@/streams";
import { SyncContext } from "@/sync";
import { SyncDiscoveredStream } from "@/sync";

import { IngestStreamSynchronizerService } from "../../../../src/sync/services/workflows/ingest-stream-synchronizer.service";
import { StreamIngestActivationService } from "../../../../src/sync/services/workflows/stream-ingest-activation.service";
import { StreamIngestDiscoveryService } from "../../../../src/sync/services/workflows/stream-ingest-discovery.service";

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

const makeDiscovered = (overrides: Partial<SyncDiscoveredStream> = {}): SyncDiscoveredStream =>
    ({
        name: "stream-a",
        source: "rtsp://camera/stream-a",
        status: "ready",
        video: {},
        audio: {},
        metadata: {},
        ...overrides,
    }) as SyncDiscoveredStream;

const makeContext = (): SyncContext =>
    ({
        podIds: ["pod-1", "pod-2"],
        ingestList: [makeDiscovered()],
        clusterList: [],
        ingestNames: new Set(["stream-a"]),
        clusterNames: new Set<string>(),
        allStreams: [],
    }) as SyncContext;

describe("IngestStreamSynchronizerService", () => {
    let service: IngestStreamSynchronizerService;
    let ingestDiscovery: jest.Mocked<StreamIngestDiscoveryService>;
    let ingestActivation: jest.Mocked<StreamIngestActivationService>;

    beforeEach(async () => {
        ingestDiscovery = {
            upsertDiscoveredStream: jest.fn(),
        } as unknown as jest.Mocked<StreamIngestDiscoveryService>;
        ingestActivation = {
            ensurePodAssignment: jest.fn(),
            ensureClusterPipeline: jest.fn(),
        } as unknown as jest.Mocked<StreamIngestActivationService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IngestStreamSynchronizerService,
                { provide: StreamIngestDiscoveryService, useValue: ingestDiscovery },
                { provide: StreamIngestActivationService, useValue: ingestActivation },
            ],
        }).compile();

        service = module.get<IngestStreamSynchronizerService>(IngestStreamSynchronizerService);
    });

    it("runs discovery, assignment, and provisioning in sequence for a single stream", async () => {
        const ingest = makeDiscovered();
        const discovered = makeStream();
        const assigned = makeStream({ assignedPod: "pod-2" });
        const callOrder: string[] = [];

        ingestDiscovery.upsertDiscoveredStream.mockImplementation(async () => {
            callOrder.push("discover");
            return discovered;
        });
        ingestActivation.ensurePodAssignment.mockImplementation(async () => {
            callOrder.push("assign");
            return assigned;
        });
        ingestActivation.ensureClusterPipeline.mockImplementation(async () => {
            callOrder.push("provision");
        });

        await service.syncStream(ingest, new Set(["other-stream"]), ["pod-1", "pod-2"]);

        expect(callOrder).toEqual(["discover", "assign", "provision"]);
        expect(ingestActivation.ensureClusterPipeline).toHaveBeenCalledWith(
            assigned,
            new Set(["other-stream"]),
        );
    });

    it("iterates all discovered streams in syncAll", async () => {
        const spy = jest.spyOn(service, "syncStream").mockResolvedValue(undefined);
        const ingestList = [makeDiscovered(), makeDiscovered({ name: "stream-b" })];

        await service.syncAll(ingestList, new Set(), ["pod-1"]);

        expect(spy).toHaveBeenCalledTimes(2);
    });

    it("delegates execute to syncAll using the sync context", async () => {
        const ctx = makeContext();
        const spy = jest.spyOn(service, "syncAll").mockResolvedValue(undefined);

        await service.execute(ctx);

        expect(spy).toHaveBeenCalledWith(ctx.ingestList, ctx.clusterNames, ctx.podIds);
    });
});