import { V3TrackItem } from "./v3-track-item.types";
import { V3PathSource } from "./v3-path-source.types";

/** A single item from the `/v3/paths/list` response. */
export interface V3PathItem {
    name?: string;
    source?: V3PathSource;
    ready?: boolean;
    bytesReceived?: number;
    bytesSent?: number;
    // Real v3 returns an array of reader descriptors; older/mocked shapes use a count.
    readers?: number | unknown[];
    tracks?: V3TrackItem[];
}
