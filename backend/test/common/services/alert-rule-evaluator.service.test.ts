import { RuleEvaluator } from "@/common/services";
import { AlertType, AlertSeverity, RuntimeAlertRule } from "@/common/domain";

describe("RuleEvaluator", () => {
    const service = new RuleEvaluator();

    const matchingRule: RuntimeAlertRule<number, void> = {
        check: (input) => input > 100,
        type: AlertType.STREAM_NOT_READY,
        severity: AlertSeverity.WARNING,
        message: (input) => `value too high: ${input}`,
    };

    const nonMatchingRule: RuntimeAlertRule<number, void> = {
        check: (input) => input > 9999,
        type: AlertType.FRAMES_IN_ERROR,
        severity: AlertSeverity.CRITICAL,
        message: () => "frames in error",
    };

    it("returns no signals when no rules match", () => {
        expect(service.evaluate("stream1", 50, undefined, [matchingRule])).toHaveLength(0);
    });

    it("returns a signal when a rule matches", () => {
        const result = service.evaluate("stream1", 150, undefined, [matchingRule]);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            subject: "stream1",
            type: AlertType.STREAM_NOT_READY,
            severity: AlertSeverity.WARNING,
            message: "value too high: 150",
        });
    });

    it("returns only matching rules when mixed", () => {
        const result = service.evaluate("stream1", 150, undefined, [matchingRule, nonMatchingRule]);

        expect(result).toHaveLength(1);
    });

    it("returns one signal per matching rule", () => {
        const second: RuntimeAlertRule<number, void> = {
            check: () => true,
            type: AlertType.FRAMES_IN_ERROR,
            severity: AlertSeverity.CRITICAL,
            message: () => "frames in error",
        };

        expect(service.evaluate("stream1", 150, undefined, [matchingRule, second])).toHaveLength(2);
    });

    it("passes context to the check function", () => {
        type Ctx = { threshold: number };
        const contextRule: RuntimeAlertRule<number, Ctx> = {
            check: (input, ctx) => input < ctx.threshold,
            type: AlertType.STREAM_NOT_READY,
            severity: AlertSeverity.INFO,
            message: () => "below threshold",
        };

        expect(service.evaluate("stream1", 50, { threshold: 100 }, [contextRule])).toHaveLength(1);
    });

    it("returns no signals when the rules list is empty", () => {
        expect(service.evaluate("stream1", 200, undefined, [])).toHaveLength(0);
    });
});
