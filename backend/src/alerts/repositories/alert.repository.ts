import { AlertSource } from "@/common";

import { Alert, AlertCreateResult, AlertCreationData, AlertUpdateData } from "../domain";

export abstract class AlertRepository {
    /**
     * Idempotently open an alert for (source, subject, type): inserts when none is
     * open, otherwise returns the existing open one with `created: false`. Atomic,
     * so concurrent reconciles for the same subject can't produce duplicates.
     */
    abstract create(data: AlertCreationData): Promise<AlertCreateResult>;

    abstract update(id: string, data: AlertUpdateData): Promise<Alert | null>;

    abstract resolveById(id: string, resolvedAt: Date): Promise<Alert | null>;

    /** Open (unresolved) alerts of a source for one subject (stream/node). */
    abstract findOpenBySourceAndSubject(source: AlertSource, subject: string): Promise<Alert[]>;

    /** Distinct subjects that currently have an open alert from a source. */
    abstract findOpenSubjects(source: AlertSource): Promise<string[]>;

    abstract findAll(): Promise<Alert[]>;
}
