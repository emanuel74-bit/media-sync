import { StreamTrack } from "../../../common/domain";
import { StreamTrackAlertContext } from "./stream-inspection.type";
import { RuntimeAlertRule } from "../../../common";

export type StreamTrackAlertRule = RuntimeAlertRule<StreamTrack[], StreamTrackAlertContext>;
