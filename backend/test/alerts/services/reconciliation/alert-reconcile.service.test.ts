import { EventEmitter2 } from "@nestjs/event-emitter";

import { Alert } from "@/alerts/domain";
import { AlertRepository } from "@/alerts/repositories";
import { AlertReconcileService } from "@/alerts/services";
import { AlertType, AlertSignal, AlertSource, AlertSeverity, SystemEventNames } from "@/common";

const openAlert = (overrides: Partial<Alert> = {}): Alert => ({
    id: "a1",
    source: AlertSource.METRICS,
    subject: "live",
    type: AlertType.STREAM_NOT_READY,
    severity: AlertSeverity.WARNING,
    message: "Stream not ready",
    isResolved: false,
    lastSeenAt: new Date(),
    ...overrides,
});

const signal = (overrides: Partial<AlertSignal> = {}): AlertSignal => ({
    subject: "live",
    type: AlertType.STREAM_NOT_READY,
    severity: AlertSeverity.WARNING,
    message: "Stream not ready",
    ...overrides,
});

describe("AlertReconcileService", () => {
    let service: AlertReconcileService;
    let repo: jest.Mocked<AlertRepository>;
    let events: jest.Mocked<EventEmitter2>;

    beforeEach(() => {
        repo = {
            create: jest
                .fn()
                .mockImplementation(async (d) => ({ alert: { id: "new", ...d }, created: true })),
            update: jest.fn().mockImplementation(async (id) => openAlert({ id })),
            resolveById: jest
                .fn()
                .mockImplementation(async (id) => openAlert({ id, isResolved: true })),
            findOpenBySourceAndSubject: jest.fn(),
            findOpenSubjects: jest.fn(),
        } as unknown as jest.Mocked<AlertRepository>;
        events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;
        service = new AlertReconcileService(repo, events);
    });

    describe("reconcileSubject", () => {
        it("adds a new alert and emits ALERT_CREATED when a signal has no open alert", async () => {
            repo.findOpenBySourceAndSubject.mockResolvedValue([]);

            await service.reconcileSubject(AlertSource.METRICS, "live", [signal()]);

            expect(repo.create).toHaveBeenCalledWith({
                source: AlertSource.METRICS,
                subject: "live",
                type: AlertType.STREAM_NOT_READY,
                severity: AlertSeverity.WARNING,
                message: "Stream not ready",
            });
            expect(events.emit).toHaveBeenCalledWith(
                SystemEventNames.ALERT_CREATED,
                expect.objectContaining({ type: AlertType.STREAM_NOT_READY }),
            );
        });

        it("does not emit ALERT_CREATED when a concurrent reconcile already opened the alert", async () => {
            repo.findOpenBySourceAndSubject.mockResolvedValue([]);
            repo.create.mockResolvedValueOnce({
                alert: openAlert({ id: "raced" }),
                created: false,
            });

            await service.reconcileSubject(AlertSource.METRICS, "live", [signal()]);

            expect(repo.create).toHaveBeenCalledTimes(1);
            expect(events.emit).not.toHaveBeenCalled();
        });

        it("refreshes (lastSeenAt only, no event) when the signal is unchanged", async () => {
            repo.findOpenBySourceAndSubject.mockResolvedValue([openAlert()]);

            await service.reconcileSubject(AlertSource.METRICS, "live", [signal()]);

            expect(repo.update).toHaveBeenCalledWith("a1", { lastSeenAt: expect.any(Date) });
            expect(repo.create).not.toHaveBeenCalled();
            expect(events.emit).not.toHaveBeenCalled();
        });

        it("updates and emits ALERT_UPDATED when severity/message changed", async () => {
            repo.findOpenBySourceAndSubject.mockResolvedValue([openAlert()]);

            await service.reconcileSubject(AlertSource.METRICS, "live", [
                signal({ severity: AlertSeverity.CRITICAL, message: "now critical" }),
            ]);

            expect(repo.update).toHaveBeenCalledWith("a1", {
                severity: AlertSeverity.CRITICAL,
                message: "now critical",
                lastSeenAt: expect.any(Date),
            });
            expect(events.emit).toHaveBeenCalledWith(
                SystemEventNames.ALERT_UPDATED,
                expect.anything(),
            );
        });

        it("resolves and emits ALERT_RESOLVED for an open alert with no matching signal", async () => {
            repo.findOpenBySourceAndSubject.mockResolvedValue([openAlert()]);

            await service.reconcileSubject(AlertSource.METRICS, "live", []);

            expect(repo.resolveById).toHaveBeenCalledWith("a1", expect.any(Date));
            expect(events.emit).toHaveBeenCalledWith(
                SystemEventNames.ALERT_RESOLVED,
                expect.anything(),
            );
        });

        it("collapses duplicate-type signals (multiple nodes) into one create", async () => {
            repo.findOpenBySourceAndSubject.mockResolvedValue([]);

            await service.reconcileSubject(AlertSource.METRICS, "live", [
                signal({ message: "not ready on ingest" }),
                signal({ message: "not ready on cluster" }),
            ]);

            expect(repo.create).toHaveBeenCalledTimes(1);
        });
    });

    describe("reconcileSource", () => {
        it("reconciles subjects with open alerts but no signals (auto-resolve a vanished stream)", async () => {
            repo.findOpenSubjects.mockResolvedValue(["gone"]);
            repo.findOpenBySourceAndSubject.mockImplementation(async (_s, subject) =>
                subject === "gone" ? [openAlert({ subject: "gone" })] : [],
            );

            await service.reconcileSource(AlertSource.METRICS, new Map([["live", [signal()]]]));

            // "gone" had an open alert and no signal this cycle → resolved.
            expect(repo.resolveById).toHaveBeenCalledTimes(1);
            // "live" had a signal and no open alert → created.
            expect(repo.create).toHaveBeenCalledTimes(1);
        });
    });

    describe("resolve", () => {
        it("marks the alert resolved and emits ALERT_RESOLVED", async () => {
            const resolved = openAlert({ isResolved: true });
            repo.resolveById.mockResolvedValue(resolved);

            const result = await service.resolve("a1");

            expect(result).toBe(resolved);
            expect(repo.resolveById).toHaveBeenCalledWith("a1", expect.any(Date));
            expect(events.emit).toHaveBeenCalledWith(SystemEventNames.ALERT_RESOLVED, resolved);
        });

        it("does not emit when the alert is already gone", async () => {
            repo.resolveById.mockResolvedValue(null);

            const result = await service.resolve("missing");

            expect(result).toBeNull();
            expect(events.emit).not.toHaveBeenCalled();
        });
    });
});
