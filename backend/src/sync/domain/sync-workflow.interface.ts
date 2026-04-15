import { SyncContext } from "./sync-context";

export interface SyncWorkflow {
    execute(context: SyncContext): Promise<void>;
}
