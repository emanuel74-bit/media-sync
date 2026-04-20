import { PodRole } from "../../../common/domain";
import { parseTracksFromPathItem } from "../parsing";
import { NewStreamInspectionData } from "../../domain";
import { V3PathItem } from "../../../infrastructure/media-mtx/types";

export function buildInspectionRecord(
    streamName: string,
    source: PodRole,
    details: V3PathItem | null,
    lastError: string | null,
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
        inspectedAt: new Date(),
    };
}
