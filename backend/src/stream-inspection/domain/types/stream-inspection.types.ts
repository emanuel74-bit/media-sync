import { StreamInspectedPayload } from "@/common";

/** A persisted inspection result — the emitted payload plus Mongo timestamps. */
export interface StreamInspectionRecord extends StreamInspectedPayload {
    createdAt?: Date;
    updatedAt?: Date;
}
