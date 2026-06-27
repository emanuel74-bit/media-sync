import { RuleEvaluator } from "@/common/services";
import type { StreamQueryService } from "@/streams";
import { TrackAlertRuler } from "@/alerts/services/track-alert-ruler.service";
import type { AlertReconcileService } from "@/alerts/services/alert-reconcile.service";
import { PodRole, TrackType, AlertType, AlertSource, StreamInspectedPayload } from "@/common";

const inspected = (overrides: Partial<StreamInspectedPayload> = {}): StreamInspectedPayload => ({
    streamName: "live",
    source: PodRole.INGEST,
    tracks: [{ type: TrackType.VIDEO }],
    metadata: {},
    inspectedAt: new Date(),
    lastError: null,
    ...overrides,
});

describe("TrackAlertRuler", () => {
    let ruler: TrackAlertRuler;
    let streamQuery: jest.Mocked<StreamQueryService>;
    let reconcile: jest.Mocked<AlertReconcileService>;

    beforeEach(() => {
        streamQuery = { findByName: jest.fn() } as unknown as jest.Mocked<StreamQueryService>;
        reconcile = {
            reconcileSubject: jest.fn(),
        } as unknown as jest.Mocked<AlertReconcileService>;
        ruler = new TrackAlertRuler(streamQuery, new RuleEvaluator(), reconcile);
    });

    it("reconciles the inspection source for the stream with a missing-audio signal", async () => {
        streamQuery.findByName.mockResolvedValue({ metadata: {} } as never);

        // only a video track → audio is missing
        await ruler.onStreamInspected(inspected({ tracks: [{ type: TrackType.VIDEO }] }));

        expect(reconcile.reconcileSubject).toHaveBeenCalledTimes(1);
        const [source, subject, signals] = reconcile.reconcileSubject.mock.calls[0];
        expect(source).toBe(AlertSource.INSPECTION);
        expect(subject).toBe("live");
        expect(signals.map((s) => s.type)).toContain(AlertType.MISSING_AUDIO_TRACK);
    });

    it("ignores inspections that ended in error", async () => {
        await ruler.onStreamInspected(inspected({ lastError: "boom" }));

        expect(streamQuery.findByName).not.toHaveBeenCalled();
        expect(reconcile.reconcileSubject).not.toHaveBeenCalled();
    });

    it("does nothing when the stream is unknown", async () => {
        streamQuery.findByName.mockResolvedValue(null);

        await ruler.onStreamInspected(inspected());

        expect(reconcile.reconcileSubject).not.toHaveBeenCalled();
    });
});
