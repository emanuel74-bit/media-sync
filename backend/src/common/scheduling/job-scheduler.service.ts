import { DiscoveryService, MetadataScanner } from "@nestjs/core";
import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";

import { ConfigService } from "@/config";

import { SCHEDULED_TASK, ScheduledTaskOptions } from "./scheduled-task.decorator";

/**
 * Discovers every `@ScheduledTask` method across the app at bootstrap and runs it on its
 * config-resolved interval. Owns the cross-cutting scheduling behavior so producers don't:
 * a per-job overlap guard (a slow run never overlaps its next tick) and error guarding
 * (a failing run is logged and swallowed, never killing the timer).
 */
@Injectable()
export class JobScheduler implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly logger = new Logger(JobScheduler.name);
    private readonly scanner = new MetadataScanner();
    private readonly timers = new Map<string, NodeJS.Timeout>();
    private readonly running = new Set<string>();

    constructor(
        private readonly discovery: DiscoveryService,
        private readonly config: ConfigService,
    ) {}

    onApplicationBootstrap(): void {
        for (const wrapper of this.discovery.getProviders()) {
            const instance = wrapper.instance as Record<string, unknown> | null | undefined;
            if (!instance || typeof instance !== "object") {
                continue;
            }
            const prototype = Object.getPrototypeOf(instance) as Record<string, unknown> | null;
            if (!prototype) {
                continue;
            }
            for (const methodName of this.scanner.getAllMethodNames(prototype)) {
                const method = prototype[methodName];
                if (typeof method !== "function") {
                    continue;
                }
                const options = Reflect.getMetadata(SCHEDULED_TASK, method) as
                    | ScheduledTaskOptions
                    | undefined;
                if (!options) {
                    continue;
                }
                this.schedule(options, () => (method as () => Promise<void>).call(instance));
            }
        }
    }

    onModuleDestroy(): void {
        for (const timer of this.timers.values()) {
            clearInterval(timer);
        }
        this.timers.clear();
    }

    private schedule(options: ScheduledTaskOptions, run: () => Promise<void>): void {
        if (this.timers.has(options.name)) {
            throw new Error(`Duplicate scheduled job name: '${options.name}'`);
        }
        const intervalMs = options.interval(this.config);
        this.timers.set(
            options.name,
            setInterval(() => void this.tick(options.name, run), intervalMs),
        );
        this.logger.log(`Scheduled '${options.name}' every ${intervalMs}ms`);
    }

    private async tick(name: string, run: () => Promise<void>): Promise<void> {
        if (this.running.has(name)) {
            this.logger.warn(`Job '${name}' is still running; skipping this tick`);
            return;
        }
        this.running.add(name);
        try {
            await run();
        } catch (error) {
            this.logger.error(`Job '${name}' failed`, error);
        } finally {
            this.running.delete(name);
        }
    }
}
