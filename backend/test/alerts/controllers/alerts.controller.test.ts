import { Test, TestingModule } from "@nestjs/testing";

import { Alert } from "@/alerts/domain";
import { AlertSeverity, AlertType } from "@/common";
import { AlertsController } from "@/alerts/controllers";
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

describe("AlertsController", () => {
    let controller: AlertsController;
    let alertsService: jest.Mocked<AlertLifecycleService>;

    beforeEach(async () => {
        alertsService = {
            listAlerts: jest.fn(),
            resolveAlert: jest.fn(),
        } as unknown as jest.Mocked<AlertLifecycleService>;

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AlertsController],
            providers: [{ provide: AlertLifecycleService, useValue: alertsService }],
        }).compile();

        controller = module.get<AlertsController>(AlertsController);
    });

    it("delegates findAll to AlertLifecycleService.listAlerts", async () => {
        const alerts = [makeAlert()];
        alertsService.listAlerts.mockResolvedValue(alerts);

        const result = await controller.findAll();

        expect(result).toBe(alerts);
        expect(alertsService.listAlerts).toHaveBeenCalledTimes(1);
    });

    it("delegates resolve to AlertLifecycleService.resolveAlert", async () => {
        const alert = makeAlert({ isResolved: true, resolvedAt: new Date() });
        alertsService.resolveAlert.mockResolvedValue(alert);

        const result = await controller.resolve("alert-1");

        expect(result).toBe(alert);
        expect(alertsService.resolveAlert).toHaveBeenCalledWith("alert-1");
    });
});
