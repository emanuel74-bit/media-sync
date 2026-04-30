import { PodRole } from "@/common";
import { V3PathItem } from "@/media-mtx";
import { NewStreamInspectionData } from "../../domain";

import { parseTracksFromPathItem } from "../parsing";

export class StreamInspectionRecordFactory {
    /**
     * Assembles a NewStreamInspectionData record from raw inspection inputs.
     * The caller is responsible for supplying `inspectedAt` so timestamp
     * ownership stays at the orchestration boundary, not inside this factory.
     */
    static build(
        streamName: string,
        source: PodRole,
        details: V3PathItem | null,
        lastError: string | null,
        inspectedAt: Date,
    ): NewStreamInspectionData {
        const tracks = details ? parseTracksFromPathItem(details) : [];
        return {
            streamName,
            source,
            tracks,
            metadata: details
                ? {
                      bytesReceived: details.bytesReceived,
                      bytesSent: details.bytesSent,
                      readers: details.readers,
                  }
                : {},
            lastError,
            inspectedAt,
        };
    }
}
