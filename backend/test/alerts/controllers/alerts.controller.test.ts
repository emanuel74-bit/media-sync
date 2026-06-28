import { Test, TestingModule } from "@nestjs/testing";

import { Alert } from "@/alerts/domain";
import { AlertAccessService } from "@/alerts/services";
import { AlertsController } from "@/alerts/controllers";
import { AlertType, AlertSource, AlertSeverity } from "@/common";

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

describe("AlertsController", () => {
    let controller: AlertsController;
    let alertsService: jest.Mocked<AlertAccessService>;

    beforeEach(async () => {
        alertsService = {
            listAlerts: jest.fn(),
            resolveAlert: jest.fn(),
        } as unknown as jest.Mocked<AlertAccessService>;

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AlertsController],
            providers: [{ provide: AlertAccessService, useValue: alertsService }],
        }).compile();

        controller = module.get<AlertsController>(AlertsController);
    });

    it("delegates findAll to AlertAccessService.listAlerts", async () => {
        const alerts = [makeAlert()];
        alertsService.listAlerts.mockResolvedValue(alerts);

        const result = await controller.findAll();

        expect(result).toBe(alerts);
        expect(alertsService.listAlerts).toHaveBeenCalledTimes(1);
    });

    it("delegates resolve to AlertAccessService.resolveAlert", async () => {
        const alert = makeAlert({ isResolved: true, resolvedAt: new Date() });
        alertsService.resolveAlert.mockResolvedValue(alert);

        const result = await controller.resolve("alert-1");

        expect(result).toBe(alert);
        expect(alertsService.resolveAlert).toHaveBeenCalledWith("alert-1");
    });
});
