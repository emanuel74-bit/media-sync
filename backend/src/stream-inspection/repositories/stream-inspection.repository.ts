import { PodRole } from "../../common";
import { StreamInspectionRecord, StreamTrack } from "../domain";

export interface NewStreamInspectionData {
    streamName: string;
    source: PodRole;
    tracks: StreamTrack[];
    metadata: Record<string, unknown>;
    lastError: string | null;
    inspectedAt: Date;
}

export abstract class StreamInspectionRepository {
    abstract save(data: NewStreamInspectionData): Promise<void>;

    abstract findLatest(streamName: string): Promise<StreamInspectionRecord | null>;

    abstract findHistory(streamName: string, limit: number): Promise<StreamInspectionRecord[]>;

    abstract findAllLatest(): Promise<StreamInspectionRecord[]>;
}
