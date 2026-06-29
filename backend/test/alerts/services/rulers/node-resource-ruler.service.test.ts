import type { ConfigService } from "@/config";
import { RuleEvaluator } from "@/alerts/services";
import { PodRole, AlertType, AlertSource, NodeSampledPayload } from "@/common";
import { NodeResourceRuler } from "@/alerts/services/rulers/node-resource-ruler.service";
import type { AlertReconcileService } from "@/alerts/services/reconciliation/alert-reconcile.service";

const sample = (overrides: Partial<NodeSampledPayload> = {}): NodeSampledPayload => ({
    podId: "cluster-1",
    context: PodRole.CLUSTER,
    cpu: 10,
    memory: 10,
    disk: 10,
    ...overrides,
});

describe("NodeResourceRuler", () => {
    let ruler: NodeResourceRuler;
    let reconcile: jest.Mocked<AlertReconcileService>;
    const config = {
        nodeCpuHighThreshold: 85,
        nodeMemoryHighThreshold: 90,
        nodeDiskHighThreshold: 85,
    } as unknown as ConfigService;

    beforeEach(() => {
        reconcile = {
            reconcileSubject: jest.fn(),
        } as unknown as jest.Mocked<AlertReconcileService>;
        ruler = new NodeResourceRuler(config, new RuleEvaluator(), reconcile);
    });

    it("raises NODE_CPU_HIGH for the node when CPU is over threshold", async () => {
        await ruler.onNodeSampled(sample({ cpu: 92 }));

        expect(reconcile.reconcileSubject).toHaveBeenCalledTimes(1);
        const [source, subject, signals] = reconcile.reconcileSubject.mock.calls[0];
        expect(source).toBe(AlertSource.NODE);
        expect(subject).toBe("cluster-1");
        expect(signals.map((s) => s.type)).toEqual([AlertType.NODE_CPU_HIGH]);
    });

    it("reconciles with no signals when all resources are under threshold (enables auto-resolve)", async () => {
        await ruler.onNodeSampled(sample());

        const [, , signals] = reconcile.reconcileSubject.mock.calls[0];
        expect(signals).toEqual([]);
    });
});
