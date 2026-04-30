import { StreamInspectionRecord } from "../domain/types/stream-inspection.types";
import { NewStreamInspectionData } from "../domain/types/stream-inspection-creation.types";

export abstract class StreamInspectionRepository {
    abstract save(data: NewStreamInspectionData): Promise<void>;

    abstract findLatest(streamName: string): Promise<StreamInspectionRecord | null>;

    abstract findHistory(streamName: string, limit: number): Promise<StreamInspectionRecord[]>;

    abstract findAllLatest(): Promise<StreamInspectionRecord[]>;
}
