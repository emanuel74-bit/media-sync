import { ContextualMediaMtxStream } from "./contextual-media-mtx-stream.types";

/** Streams returned by a role-wide scrape plus the nodes whose responses were authoritative. */
export interface MediaMtxStreamListingResult {
    streams: ContextualMediaMtxStream[];
    nodeIds: string[];
    observedNodeIds: string[];
}
