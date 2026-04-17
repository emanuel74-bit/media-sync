import { PodRole } from "../../../common/domain";
import { MediaMtxStreamInfo } from "./media-mtx-stream-info.type";

export type ContextualMediaMtxStream = {
    stream: MediaMtxStreamInfo;
    context: PodRole;
};
