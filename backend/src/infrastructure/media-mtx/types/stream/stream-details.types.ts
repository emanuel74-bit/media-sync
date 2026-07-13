import { StreamTrack } from "@/common";

import { StreamPathMetadata } from "./stream-path-metadata.types";

/** Domain-facing inspection details for a single stream — raw V3 shapes stay inside infrastructure. */
export interface StreamDetails {
    streamName: string;
    tracks: StreamTrack[];
    metadata: StreamPathMetadata;
}
