import { RuleEvaluator } from "@/alerts/services";
import { PodRole, AlertType, AlertSource, MetricsCollectedPayload } from "@/common";
import { MetricAlertRuler } from "@/alerts/services/rulers/metric-alert-ruler.service";
import type { AlertReconcileService } from "@/alerts/services/reconciliation/alert-reconcile.service";

const pathSample = (streamName: string, ready: boolean, framesInError = 0) => ({
    streamName,
    context: PodRole.CLUSTER,
    node: "cluster-1",
    state: ready ? "ready" : "notReady",
    ready,
    bytesReceived: 1,
    bytesSent: 0,
    readers: 0,
    framesInError,
});

const payload = (paths: ReturnType<typeof pathSample>[]): MetricsCollectedPayload => ({
    nodes: [],
    paths,
    collectedAt: new Date(),
});

describe("MetricAlertRuler", () => {
    let ruler: MetricAlertRuler;
    let reconcile: jest.Mocked<AlertReconcileService>;

    beforeEach(() => {
        reconcile = { reconcileSource: jest.fn() } as unknown as jest.Mocked<AlertReconcileService>;
        ruler = new MetricAlertRuler(new RuleEvaluator(), reconcile);
    });

    it("reconciles the metrics source with per-stream signals from operational rules", async () => {
        await ruler.onMetricsCollected(
            payload([pathSample("bad", false, 3), pathSample("good", true)]),
        );

        expect(reconcile.reconcileSource).toHaveBeenCalledTimes(1);
        const [source, signalsBySubject] = reconcile.reconcileSource.mock.calls[0];
        expect(source).toBe(AlertSource.METRICS);

        const badSignals = signalsBySubject.get("bad")!.map((s) => s.type);
        expect(badSignals).toEqual(
            expect.arrayContaining([AlertType.STREAM_NOT_READY, AlertType.FRAMES_IN_ERROR]),
        );
        // a ready path with no errors produces no signals, but the subject is still
        // present so its alerts can be resolved.
        expect(signalsBySubject.get("good")).toEqual([]);
    });
});
