import { PodRole } from "../enums";
import { StreamTrack } from "./stream-track.types";

/** Emitted after each stream inspection cycle for a single stream. */
export interface StreamInspectedPayload {
    streamName: string;
    source: PodRole;
    tracks: StreamTrack[];
    metadata: Record<string, unknown>;
    inspectedAt: Date;
    lastError: string | null;
}
