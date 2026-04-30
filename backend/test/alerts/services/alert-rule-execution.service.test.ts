import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { RuntimeAlertRule } from "@/alerts";
import { AlertRuleExecutionService } from "@/alerts";
import { AlertSeverity, AlertType } from "@/common";
import { SystemEventNames } from "@/system-events";

describe("AlertRuleExecutionService", () => {
    let service: AlertRuleExecutionService;
    let events: jest.Mocked<EventEmitter2>;

    beforeEach(async () => {
        events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [AlertRuleExecutionService, { provide: EventEmitter2, useValue: events }],
        }).compile();

        service = module.get<AlertRuleExecutionService>(AlertRuleExecutionService);
    });

    describe("evaluateAndEmit", () => {
        const matchingRule: RuntimeAlertRule<number, void> = {
            check: (input) => input > 100,
            type: AlertType.BITRATE_LOW,
            severity: AlertSeverity.WARNING,
            message: (input) => `Bitrate too low: ${input}`,
        };

        const nonMatchingRule: RuntimeAlertRule<number, void> = {
            check: (input) => input > 9999,
            type: AlertType.PACKET_LOSS,
            severity: AlertSeverity.CRITICAL,
            message: () => "Packet loss detected",
        };

        it("returns an empty array when no rules match", async () => {
            const result = await service.evaluateAndEmit("stream1", 50, undefined, [matchingRule]);

            expect(result).toHaveLength(0);
            expect(events.emit).not.toHaveBeenCalled();
        });

        it("returns a payload and emits an event when a rule matches", async () => {
            const result = await service.evaluateAndEmit("stream1", 150, undefined, [matchingRule]);

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                streamName: "stream1",
                type: AlertType.BITRATE_LOW,
                severity: AlertSeverity.WARNING,
                message: "Bitrate too low: 150",
            });
            expect(events.emit).toHaveBeenCalledTimes(1);
            expect(events.emit).toHaveBeenCalledWith(SystemEventNames.ALERT_CREATE, result[0]);
        });

        it("only emits for matching rules when mixed", async () => {
            const result = await service.evaluateAndEmit("stream1", 150, undefined, [
                matchingRule,
                nonMatchingRule,
            ]);

            expect(result).toHaveLength(1);
            expect(events.emit).toHaveBeenCalledTimes(1);
        });

        it("emits once per matching rule when multiple rules match", async () => {
            const secondMatchingRule: RuntimeAlertRule<number, void> = {
                check: () => true,
                type: AlertType.LATENCY_HIGH,
                severity: AlertSeverity.CRITICAL,
                message: () => "Latency high",
            };

            const result = await service.evaluateAndEmit("stream1", 150, undefined, [
                matchingRule,
                secondMatchingRule,
            ]);

            expect(result).toHaveLength(2);
            expect(events.emit).toHaveBeenCalledTimes(2);
        });

        it("passes context to the check function", async () => {
            type Ctx = { threshold: number };
            const contextRule: RuntimeAlertRule<number, Ctx> = {
                check: (input, ctx) => input < ctx.threshold,
                type: AlertType.BITRATE_LOW,
                severity: AlertSeverity.INFO,
                message: () => "below threshold",
            };

            const result = await service.evaluateAndEmit("stream1", 50, { threshold: 100 }, [
                contextRule,
            ]);

            expect(result).toHaveLength(1);
        });

        it("returns empty array when rules list is empty", async () => {
            const result = await service.evaluateAndEmit("stream1", 200, undefined, []);

            expect(result).toHaveLength(0);
            expect(events.emit).not.toHaveBeenCalled();
        });
    });
});