import { PodRole } from "@/common";
import { MediaMtxStreamInfo } from "@/infrastructure";

/** A stream discovered on a MediaMTX node, tagged with the role of the node it came from. */
export type ContextualMediaMtxStream = {
    stream: MediaMtxStreamInfo;
    context: PodRole;
};
