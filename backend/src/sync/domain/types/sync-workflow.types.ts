import { SyncContext } from "./sync-context.types";

export interface SyncWorkflow {
    readonly name: string;
    execute(context: SyncContext): Promise<void>;
}
