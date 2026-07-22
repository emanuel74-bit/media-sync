import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { DiscoveryService } from "@nestjs/core";

import { ConfigService } from "@/config";
import { ScheduledTask } from "@/common";
import { JobScheduler } from "@/common/scheduling/job-scheduler.service";

const discoveryWith = (...instances: object[]): DiscoveryService =>
    ({
        getProviders: () => instances.map((instance) => ({ instance })),
    }) as unknown as DiscoveryService;

const configWith = (intervalMs: number): ConfigService =>
    ({ metricsPollInterval: intervalMs }) as unknown as ConfigService;

describe("JobScheduler", () => {
    let scheduler: JobScheduler | undefined;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(Logger.prototype, "log").mockImplementation();
        jest.spyOn(Logger.prototype, "warn").mockImplementation();
        jest.spyOn(Logger.prototype, "error").mockImplementation();
    });

    afterEach(() => {
        scheduler?.onModuleDestroy();
        scheduler = undefined;
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it("discovers a @ScheduledTask method and runs it on its config-resolved interval", async () => {
        class Probe {
            runs = 0;
            @ScheduledTask({ name: "probe.run", interval: (c) => c.metricsPollInterval })
            async run(): Promise<void> {
                this.runs += 1;
            }
        }
        const probe = new Probe();
        scheduler = new JobScheduler(discoveryWith(probe), configWith(1000));

        scheduler.onApplicationBootstrap();
        expect(probe.runs).toBe(0);

        await jest.advanceTimersByTimeAsync(1000);
        expect(probe.runs).toBe(1);

        await jest.advanceTimersByTimeAsync(1000);
        expect(probe.runs).toBe(2);
    });

    it("skips a tick while the previous run is still in flight (overlap guard)", async () => {
        class BlockingProbe {
            entered = 0;
            @ScheduledTask({ name: "blocking.run", interval: (c) => c.metricsPollInterval })
            async run(): Promise<void> {
                this.entered += 1;
                await new Promise<void>(() => {});
            }
        }
        const probe = new BlockingProbe();
        scheduler = new JobScheduler(discoveryWith(probe), configWith(1000));

        scheduler.onApplicationBootstrap();
        await jest.advanceTimersByTimeAsync(1000);
        await jest.advanceTimersByTimeAsync(1000);

        expect(probe.entered).toBe(1);
    });

    it("swallows a failing run and keeps ticking", async () => {
        class FailingProbe {
            calls = 0;
            @ScheduledTask({ name: "failing.run", interval: (c) => c.metricsPollInterval })
            async run(): Promise<void> {
                this.calls += 1;
                throw new Error("boom");
            }
        }
        const probe = new FailingProbe();
        scheduler = new JobScheduler(discoveryWith(probe), configWith(1000));

        scheduler.onApplicationBootstrap();
        await jest.advanceTimersByTimeAsync(1000);
        await jest.advanceTimersByTimeAsync(1000);

        expect(probe.calls).toBe(2);
    });

    it("ignores providers that have no @ScheduledTask methods", () => {
        class Plain {
            async doStuff(): Promise<void> {}
        }
        scheduler = new JobScheduler(discoveryWith(new Plain()), configWith(1000));

        expect(() => scheduler?.onApplicationBootstrap()).not.toThrow();
    });
});
