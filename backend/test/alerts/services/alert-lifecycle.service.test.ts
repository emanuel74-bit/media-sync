import { EventEmitter2 } from "@nestjs/event-emitter";

import { Alert } from "@/alerts/domain";
import { AlertRepository } from "@/alerts/repositories";
import { AlertLifecycleService } from "@/alerts/services";
import { AlertType, AlertSource, AlertSeverity, SystemEventNames } from "@/common";

const makeAlert = (overrides: Partial<Alert> = {}): Alert => ({
    id: "alert-1",
    source: AlertSource.METRICS,
    subject: "stream-1",
    type: AlertType.STREAM_NOT_READY,
    severity: AlertSeverity.WARNING,
    message: "Stream not ready",
    isResolved: false,
    lastSeenAt: new Date(),
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe("AlertLifecycleService", () => {
    let service: AlertLifecycleService;
    let alertRepository: jest.Mocked<AlertRepository>;
    let events: jest.Mocked<EventEmitter2>;

    beforeEach(() => {
        alertRepository = {
            resolveById: jest.fn(),
            findAll: jest.fn(),
        } as unknown as jest.Mocked<AlertRepository>;
        events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;
        service = new AlertLifecycleService(alertRepository, events);
    });

    it("delegates listAlerts to the repository", async () => {
        const alerts = [makeAlert()];
        alertRepository.findAll.mockResolvedValue(alerts);

        const result = await service.listAlerts();

        expect(result).toBe(alerts);
        expect(alertRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it("resolves alerts and emits ALERT_RESOLVED", async () => {
        const resolved = makeAlert({ isResolved: true, resolvedAt: new Date() });
        alertRepository.resolveById.mockResolvedValue(resolved);

        const result = await service.resolveAlert("alert-1");

        expect(result).toBe(resolved);
        expect(alertRepository.resolveById).toHaveBeenCalledWith("alert-1", expect.any(Date));
        expect(events.emit).toHaveBeenCalledWith(SystemEventNames.ALERT_RESOLVED, resolved);
    });

    it("does not emit ALERT_RESOLVED when the alert does not exist", async () => {
        alertRepository.resolveById.mockResolvedValue(null);

        const result = await service.resolveAlert("missing-alert");

        expect(result).toBeNull();
        expect(events.emit).not.toHaveBeenCalled();
    });
});
