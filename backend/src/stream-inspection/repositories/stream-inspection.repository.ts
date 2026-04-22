import { StreamInspectionRecord, NewStreamInspectionData } from "@/stream-inspection";

export abstract class StreamInspectionRepository {
    abstract save(data: NewStreamInspectionData): Promise<void>;

    abstract findLatest(streamName: string): Promise<StreamInspectionRecord | null>;

    abstract findHistory(streamName: string, limit: number): Promise<StreamInspectionRecord[]>;

    abstract findAllLatest(): Promise<StreamInspectionRecord[]>;
}
