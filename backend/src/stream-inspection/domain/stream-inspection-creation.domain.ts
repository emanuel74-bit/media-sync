import { PodRole } from "../../common";
import { StreamTrack } from "../../common";

export interface NewStreamInspectionData {
    streamName: string;
    source: PodRole;
    tracks: StreamTrack[];
    metadata: Record<string, unknown>;
    lastError: string | null;
    inspectedAt: Date;
}
