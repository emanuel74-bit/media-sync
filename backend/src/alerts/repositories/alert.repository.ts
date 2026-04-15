import { AlertType } from "../../common";
import { Alert, AlertCreationData } from "../domain";

export abstract class AlertRepository {
    abstract findUnresolvedByStreamAndType(
        streamName: string,
        type: AlertType,
    ): Promise<Alert | null>;

    abstract create(data: AlertCreationData): Promise<Alert>;

    abstract resolveById(id: string, resolvedAt: Date): Promise<Alert | null>;

    abstract findAll(): Promise<Alert[]>;
}
