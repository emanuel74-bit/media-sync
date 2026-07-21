import { PodRole } from "@/common";
import { MediaMtxStreamInfo } from "@/infrastructure";

/**
 * A stream discovered on a MediaMTX node, tagged with the role of the node it came from and,
 * for per-node-addressed roles (ingest), the specific pod it lives on (`nodeId`).
 */
export interface ContextualMediaMtxStream {
    stream: MediaMtxStreamInfo;
    context: PodRole;
    nodeId?: string | null;
}
