import { PodRole } from "../../common";
import { StreamInspectionRecord, StreamTrack } from "../domain";
import { NewStreamInspectionData } from "../domain/stream-inspection-creation.domain";

export { NewStreamInspectionData } from "../domain/stream-inspection-creation.domain";

export abstract class StreamInspectionRepository {
    abstract save(data: NewStreamInspectionData): Promise<void>;

    abstract findLatest(streamName: string): Promise<StreamInspectionRecord | null>;

    abstract findHistory(streamName: string, limit: number): Promise<StreamInspectionRecord[]>;

    abstract findAllLatest(): Promise<StreamInspectionRecord[]>;
}
