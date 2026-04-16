import { PodRole } from "../../common";
import { StreamTrack } from "./stream-inspection.domain";

export interface NewStreamInspectionData {
    streamName: string;
    source: PodRole;
    tracks: StreamTrack[];
    metadata: Record<string, unknown>;
    lastError: string | null;
    inspectedAt: Date;
}
