import { SyncContext } from "./sync-context.type";

export interface SyncWorkflow {
    execute(context: SyncContext): Promise<void>;
}
