import { PodRole, StreamTrack } from "../../common/domain";

export interface NewStreamInspectionData {
    streamName: string;
    source: PodRole;
    tracks: StreamTrack[];
    metadata: Record<string, unknown>;
    lastError: string | null;
    inspectedAt: Date;
}
