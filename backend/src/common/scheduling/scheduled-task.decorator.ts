import { ConfigService } from "@/config";

/** Reflection metadata key for a method's scheduled-task options. This is NOT a DI token. */
export const SCHEDULED_TASK = Symbol("SCHEDULED_TASK");

export interface ScheduledTaskOptions {
    /** Stable, unique job name used in logs and overlap tracking. */
    name: string;
    /** Resolves the run interval in ms from config; evaluated once at bootstrap. */
    interval: (config: ConfigService) => number;
}

/**
 * Marks an async, no-arg method as a scheduled job. `JobScheduler` discovers every
 * decorated method at bootstrap, resolves its interval from `ConfigService`, and runs it
 * on that cadence with overlap protection and error guarding. Defining a job is a single
 * declaration — there is no separate registration step to forget.
 */
export function ScheduledTask(options: ScheduledTaskOptions): MethodDecorator {
    return (_target, _propertyKey, descriptor) => {
        Reflect.defineMetadata(SCHEDULED_TASK, options, descriptor.value as object);
        return descriptor;
    };
}
