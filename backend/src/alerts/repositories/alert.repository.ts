import { AlertSource } from "@/common";

import { Alert, AlertCreationData, AlertUpdateData } from "../domain";

export abstract class AlertRepository {
    abstract create(data: AlertCreationData): Promise<Alert>;

    abstract update(id: string, data: AlertUpdateData): Promise<Alert | null>;

    abstract resolveById(id: string, resolvedAt: Date): Promise<Alert | null>;

    /** Open (unresolved) alerts of a source for one subject (stream/node). */
    abstract findOpenBySourceAndSubject(source: AlertSource, subject: string): Promise<Alert[]>;

    /** Distinct subjects that currently have an open alert from a source. */
    abstract findOpenSubjects(source: AlertSource): Promise<string[]>;

    abstract findAll(): Promise<Alert[]>;
}
