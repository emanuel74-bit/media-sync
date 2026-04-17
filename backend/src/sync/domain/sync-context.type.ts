import { Stream } from "../../streams/domain";
import { SyncDiscoveredStream } from "./sync-discovered-stream.type";

export interface SyncContext {
    ingestList: SyncDiscoveredStream[];
    clusterList: SyncDiscoveredStream[];
    ingestNames: Set<string>;
    clusterNames: Set<string>;
    podIds: string[];
    allStreams: Stream[];
}
