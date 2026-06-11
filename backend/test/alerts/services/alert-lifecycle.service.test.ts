import { EventEmitter2 } from "@nestjs/event-emitter";

import { Alert } from "@/alerts/domain";
import { AlertRepository } from "@/alerts/repositories";
import { AlertSeverity, AlertType, SystemEventNames } from "@/common";
import { AlertLifecycleService } from "@/alerts/services";

const makeAlert = (overrides: Partial<Alert> = {}): Alert => ({
    id: "alert-1",
    streamName: "stream-1",
    type: AlertType.PACKET_LOSS,
    severity: AlertSeverity.WARNING,
    message: "Packet loss high",
    isResolved: false,
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe("AlertLifecycleService", () => {
    let service: AlertLifecycleService;
    let alertRepository: jest.Mocked<AlertRepository>;
    let events: jest.Mocked<EventEmitter2>;

    beforeEach(async () => {
        alertRepository = {
            findUnresolvedByStreamAndType: jest.fn(),
            create: jest.fn(),
            resolveById: jest.fn(),
            findAll: jest.fn(),
        } as unknown as jest.Mocked<AlertRepository>;

        events = {
            emit: jest.fn(),
        } as unknown as jest.Mocked<EventEmitter2>;

        service = new AlertLifecycleService(alertRepository, events);
    });

    it("returns the existing unresolved alert without creating or emitting", async () => {
        const existing = makeAlert();
        alertRepository.findUnresolvedByStreamAndType.mockResolvedValue(existing);

        const result = await service.findOrCreateAlert({
            streamName: "stream-1",
            type: AlertType.PACKET_LOSS,
            severity: AlertSeverity.WARNING,
            message: "Packet loss high",
        });

        expect(result).toBe(existing);
        expect(alertRepository.create).not.toHaveBeenCalled();
        expect(events.emit).not.toHaveBeenCalled();
    });

    it("creates a new alert and emits ALERT_CREATED when none exists", async () => {
        const created = makeAlert();
        alertRepository.findUnresolvedByStreamAndType.mockResolvedValue(null);
        alertRepository.create.mockResolvedValue(created);

        const result = await service.findOrCreateAlert({
            streamName: "stream-1",
            type: AlertType.PACKET_LOSS,
            severity: AlertSeverity.WARNING,
            message: "Packet loss high",
        });

        expect(result).toBe(created);
        expect(alertRepository.create).toHaveBeenCalledWith({
            streamName: "stream-1",
            type: AlertType.PACKET_LOSS,
            severity: AlertSeverity.WARNING,
            message: "Packet loss high",
        });
        expect(events.emit).toHaveBeenCalledWith(SystemEventNames.ALERT_CREATED, created);
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
        expect(events.emit).not.toHaveBeenCalledWith(
            SystemEventNames.ALERT_RESOLVED,
            expect.anything(),
        );
    });
});
