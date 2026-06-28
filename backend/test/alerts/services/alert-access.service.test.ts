import { Alert } from "@/alerts/domain";
import { AlertRepository } from "@/alerts/repositories";
import { AlertType, AlertSource, AlertSeverity } from "@/common";
import { AlertAccessService, AlertReconcileService } from "@/alerts/services";

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

describe("AlertAccessService", () => {
    let service: AlertAccessService;
    let alertRepository: jest.Mocked<AlertRepository>;
    let reconcile: jest.Mocked<AlertReconcileService>;

    beforeEach(() => {
        alertRepository = {
            findAll: jest.fn(),
        } as unknown as jest.Mocked<AlertRepository>;
        reconcile = { resolve: jest.fn() } as unknown as jest.Mocked<AlertReconcileService>;
        service = new AlertAccessService(alertRepository, reconcile);
    });

    it("delegates listAlerts to the repository", async () => {
        const alerts = [makeAlert()];
        alertRepository.findAll.mockResolvedValue(alerts);

        const result = await service.listAlerts();

        expect(result).toBe(alerts);
        expect(alertRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it("delegates resolveAlert to the reconcile engine and returns its result", async () => {
        const resolved = makeAlert({ isResolved: true, resolvedAt: new Date() });
        reconcile.resolve.mockResolvedValue(resolved);

        const result = await service.resolveAlert("alert-1");

        expect(result).toBe(resolved);
        expect(reconcile.resolve).toHaveBeenCalledWith("alert-1");
    });
});
