import { PodRole, StreamStatus } from "@/common";
import { AlertEvaluationService } from "@/alerts";
import { Stream, StreamQueryService } from "@/streams";
import { StreamTrack, SystemEventNames, TrackType } from "@/common";
import { STREAM_TRACK_ALERT_RULES } from "@/stream-inspection/domain";
import { StreamTrackAlertService } from "@/stream-inspection/services";

const makeStream = (overrides: Partial<Stream> = {}): Stream => ({
    name: "stream-1",
    source: "rtsp://source",
    status: StreamStatus.SYNCED,
    metadata: {
        hasExpectedAudio: true,
        hasExpectedVideo: true,
    },
    isEnabled: true,
    isManual: false,
    activeConsumers: 0,
    assignedPod: "pod-1",
    assignedAt: new Date(),
    lastSeenAt: new Date(),
    lastSyncedAt: new Date(),
    lastError: null,
    ...overrides,
});

describe("StreamTrackAlertService", () => {
    let service: StreamTrackAlertService;
    let streamQuery: jest.Mocked<StreamQueryService>;
    let alerts: jest.Mocked<AlertEvaluationService>;

    const tracks: StreamTrack[] = [{ type: TrackType.VIDEO, codec: "h264" }];

    beforeEach(() => {
        streamQuery = {
            findByName: jest.fn(),
        } as unknown as jest.Mocked<StreamQueryService>;

        alerts = {
            evaluateAndCreate: jest.fn(),
        } as unknown as jest.Mocked<AlertEvaluationService>;

        service = new StreamTrackAlertService(streamQuery, alerts);
    });

    it("ignores inspected events that carry a lastError", async () => {
        const evaluateSpy = jest.spyOn(service, "evaluate").mockResolvedValue();

        await service.handleStreamInspected({
            streamName: "stream-1",
            source: PodRole.INGEST,
            tracks,
            metadata: {},
            inspectedAt: new Date(),
            lastError: "inspection failed",
        });

        expect(evaluateSpy).not.toHaveBeenCalled();
    });

    it("delegates successful inspected events to evaluate", async () => {
        const evaluateSpy = jest.spyOn(service, "evaluate").mockResolvedValue();

        await service.handleStreamInspected({
            streamName: "stream-1",
            source: PodRole.INGEST,
            tracks,
            metadata: {},
            inspectedAt: new Date(),
            lastError: null,
        });

        expect(evaluateSpy).toHaveBeenCalledWith("stream-1", tracks);
    });

    it("returns without evaluating rules when the stream record is missing", async () => {
        streamQuery.findByName.mockResolvedValue(null);

        await service.evaluate("stream-1", tracks);

        expect(alerts.evaluateAndCreate).not.toHaveBeenCalled();
    });

    it("builds alert context from stream metadata and delegates to AlertEvaluationService", async () => {
        streamQuery.findByName.mockResolvedValue(makeStream());
        alerts.evaluateAndCreate.mockResolvedValue(undefined);

        await service.evaluate("stream-1", tracks);

        expect(alerts.evaluateAndCreate).toHaveBeenCalledWith(
            "stream-1",
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
});
