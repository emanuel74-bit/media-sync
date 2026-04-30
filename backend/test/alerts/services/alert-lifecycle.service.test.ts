import { EventEmitter2 } from "@nestjs/event-emitter";

import { Alert } from "@/alerts";
import { AlertType } from "@/common";
import { AlertSeverity } from "@/common";
import { AlertRepository } from "@/alerts";
import { AlertLifecycleService } from "@/alerts";
import { AlertCreateRequestedPayload, SystemEventNames } from "@/system-events";

const makePayload = (
    overrides: Partial<AlertCreateRequestedPayload> = {},
): AlertCreateRequestedPayload => ({
    streamName: "stream-a",
    type: AlertType.BITRATE_LOW,
    severity: AlertSeverity.WARNING,
    message: "Bitrate too low",
    ...overrides,
});

const makeAlert = (overrides: Partial<Alert> = {}): Alert =>
    ({
        id: "alert-1",
        streamName: "stream-a",
        type: AlertType.BITRATE_LOW,
        severity: AlertSeverity.WARNING,
        message: "Bitrate too low",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        resolvedAt: null,
        isResolved: false,
        ...overrides,
    }) as Alert;

describe("AlertLifecycleService", () => {
    let service: AlertLifecycleService;
    let alertRepository: jest.Mocked<AlertRepository>;
    let events: jest.Mocked<EventEmitter2>;

    beforeEach(() => {
        alertRepository = {
            findUnresolvedByStreamAndType: jest.fn(),
            create: jest.fn(),
            findAll: jest.fn(),
            resolveById: jest.fn(),
        } as unknown as jest.Mocked<AlertRepository>;

        events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

        service = new AlertLifecycleService(alertRepository, events);
    });

    describe("findOrCreateAlert", () => {
        it("returns an existing unresolved alert without creating a new one", async () => {
            const existing = makeAlert();
            alertRepository.findUnresolvedByStreamAndType.mockResolvedValue(existing);

            const result = await service.findOrCreateAlert(makePayload());

            expect(result).toBe(existing);
            expect(alertRepository.create).not.toHaveBeenCalled();
            expect(events.emit).not.toHaveBeenCalled();
        });

        it("creates an alert and emits ALERT_CREATED when no unresolved alert exists", async () => {
            const created = makeAlert();
            alertRepository.findUnresolvedByStreamAndType.mockResolvedValue(null);
            alertRepository.create.mockResolvedValue(created);

            const payload = makePayload();
            const result = await service.findOrCreateAlert(payload);

            expect(alertRepository.create).toHaveBeenCalledWith(payload);
            expect(result).toBe(created);
            expect(events.emit).toHaveBeenCalledWith(SystemEventNames.ALERT_CREATED, created);
        });
    });

    describe("handleAlertCreateRequested", () => {
        it("delegates alert creation requests to findOrCreateAlert", async () => {
            const payload = makePayload();
            const spy = jest.spyOn(service, "findOrCreateAlert").mockResolvedValue(makeAlert());

            await service.handleAlertCreateRequested(payload);

            expect(spy).toHaveBeenCalledWith(payload);
        });
    });

    describe("listAlerts", () => {
        it("returns all alerts from the repository", async () => {
            const alerts = [makeAlert(), makeAlert({ id: "alert-2" })];
            alertRepository.findAll.mockResolvedValue(alerts);

            await expect(service.listAlerts()).resolves.toEqual(alerts);
        });
    });

    describe("resolveAlert", () => {
        it("emits ALERT_RESOLVED when an alert is resolved", async () => {
            const resolved = makeAlert({ isResolved: true, resolvedAt: new Date() });
            alertRepository.resolveById.mockResolvedValue(resolved);

            const result = await service.resolveAlert("alert-1");

            expect(result).toBe(resolved);
            expect(events.emit).toHaveBeenCalledWith(SystemEventNames.ALERT_RESOLVED, resolved);
        });

        it("does not emit when the alert cannot be resolved", async () => {
            alertRepository.resolveById.mockResolvedValue(null);

            await expect(service.resolveAlert("missing")).resolves.toBeNull();
            expect(events.emit).not.toHaveBeenCalled();
        });
    });
});