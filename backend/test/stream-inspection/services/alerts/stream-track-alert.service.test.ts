import { Test, TestingModule } from "@nestjs/testing";

import { AlertRuleExecutionService } from "@/alerts";
import { PodRole } from "@/common";
import { Stream } from "@/streams";
import { StreamTrack } from "@/common";
import { StreamsFacadeService } from "@/streams";
import { STREAM_TRACK_ALERT_RULES } from "@/stream-inspection";
import { StreamInspectedPayload } from "@/system-events";

import { StreamTrackAlertService } from "../../../../src/stream-inspection/services/alerts/stream-track-alert.service";

const makeStream = (overrides: Partial<Stream> = {}): Stream =>
    ({
        name: "stream-a",
        source: "rtsp://camera/stream-a",
        status: "ready",
        assignedPod: null,
        isEnabled: true,
        isManual: false,
        metadata: {
            hasExpectedAudio: true,
            hasExpectedVideo: true,
        },
        activeConsumers: 0,
        lastError: null,
        ...overrides,
    }) as Stream;

const makeTracks = (): StreamTrack[] =>
    [
        { type: "video", codec: "H264" },
        { type: "audio", codec: "AAC" },
    ] as StreamTrack[];

const makePayload = (overrides: Partial<StreamInspectedPayload> = {}): StreamInspectedPayload => ({
    streamName: "stream-a",
    source: PodRole.INGEST,
    tracks: makeTracks(),
    metadata: {},
    inspectedAt: new Date("2026-01-01T00:00:00.000Z"),
    lastError: null,
    ...overrides,
});

describe("StreamTrackAlertService", () => {
    let service: StreamTrackAlertService;
    let streams: jest.Mocked<StreamsFacadeService>;
    let alertRuleExecution: jest.Mocked<AlertRuleExecutionService>;

    beforeEach(async () => {
        streams = {
            findByName: jest.fn(),
        } as unknown as jest.Mocked<StreamsFacadeService>;
        alertRuleExecution = {
            evaluateAndEmit: jest.fn(),
        } as unknown as jest.Mocked<AlertRuleExecutionService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StreamTrackAlertService,
                { provide: StreamsFacadeService, useValue: streams },
                { provide: AlertRuleExecutionService, useValue: alertRuleExecution },
            ],
        }).compile();

        service = module.get<StreamTrackAlertService>(StreamTrackAlertService);
    });

    it("ignores inspected payloads that contain a lastError", async () => {
        await service.handleStreamInspected(makePayload({ lastError: "timeout" }));

        expect(streams.findByName).not.toHaveBeenCalled();
        expect(alertRuleExecution.evaluateAndEmit).not.toHaveBeenCalled();
    });

    it("returns without invoking the evaluator when the stream cannot be found", async () => {
        streams.findByName.mockResolvedValue(null);

        await service.evaluate("missing", makeTracks());

        expect(alertRuleExecution.evaluateAndEmit).not.toHaveBeenCalled();
    });

    it("maps stream metadata into the alert context and invokes the evaluator", async () => {
        const stream = makeStream();
        const tracks = makeTracks();
        streams.findByName.mockResolvedValue(stream);
        alertRuleExecution.evaluateAndEmit.mockResolvedValue([]);

        await service.evaluate(stream.name, tracks);

        expect(alertRuleExecution.evaluateAndEmit).toHaveBeenCalledWith(
            stream.name,
            tracks,
            {
                metadata: {
                    hasExpectedAudio: true,
                    hasExpectedVideo: true,
                },
            },
            STREAM_TRACK_ALERT_RULES,
        );
    });

    it("delegates clean inspected payloads to evaluate", async () => {
        const payload = makePayload();
        const spy = jest.spyOn(service, "evaluate").mockResolvedValue(undefined);

        await service.handleStreamInspected(payload);

        expect(spy).toHaveBeenCalledWith(payload.streamName, payload.tracks);
    });
});
