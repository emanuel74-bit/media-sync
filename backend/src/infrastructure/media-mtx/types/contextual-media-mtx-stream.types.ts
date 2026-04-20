import { PodRole } from "../../../common/domain";
import { MediaMtxStreamInfo } from "./media-mtx-stream-info.types";

export type ContextualMediaMtxStream = {
    stream: MediaMtxStreamInfo;
    context: PodRole;
};
