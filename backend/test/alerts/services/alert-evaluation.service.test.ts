import { AlertEvaluationService } from "@/alerts";
import { AlertLifecycleService } from "@/alerts/services";
import { RuleEvaluator } from "@/common";
import { AlertSeverity, AlertType, RuntimeAlertRule } from "@/common/domain";

describe("AlertEvaluationService", () => {
    let service: AlertEvaluationService;
    let ruleEvaluator: jest.Mocked<RuleEvaluator>;
    let alertLifecycle: jest.Mocked<AlertLifecycleService>;

    beforeEach(() => {
        ruleEvaluator = {
            evaluate: jest.fn(),
        } as unknown as jest.Mocked<RuleEvaluator>;

        alertLifecycle = {
            findOrCreateAlert: jest.fn(),
        } as unknown as jest.Mocked<AlertLifecycleService>;

        service = new AlertEvaluationService(ruleEvaluator, alertLifecycle);
    });

    it("evaluates rules and creates alerts for each matching payload", async () => {
        const rules: RuntimeAlertRule<number, void>[] = [
            {
                check: () => true,
                type: AlertType.BITRATE_LOW,
                severity: AlertSeverity.WARNING,
                message: () => "Bitrate too low",
            },
        ];

        ruleEvaluator.evaluate.mockResolvedValue([
            {
                streamName: "stream-1",
                type: AlertType.BITRATE_LOW,
                severity: AlertSeverity.WARNING,
                message: "Bitrate too low",
            },
        ]);
        alertLifecycle.findOrCreateAlert.mockResolvedValue({} as never);

        await service.evaluateAndCreate("stream-1", 123, undefined, rules);

        expect(ruleEvaluator.evaluate).toHaveBeenCalledWith("stream-1", 123, undefined, rules);
        expect(alertLifecycle.findOrCreateAlert).toHaveBeenCalledWith({
            streamName: "stream-1",
            type: AlertType.BITRATE_LOW,
            severity: AlertSeverity.WARNING,
            message: "Bitrate too low",
        });
    });

    it("does nothing when evaluation returns no payloads", async () => {
        ruleEvaluator.evaluate.mockResolvedValue([]);

        await service.evaluateAndCreate("stream-1", 123, undefined, []);

        expect(alertLifecycle.findOrCreateAlert).not.toHaveBeenCalled();
    });
});