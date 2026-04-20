import { RuntimeAlertRule } from "../../../common";
import { StreamTrack } from "../../../common/domain";
import { StreamTrackAlertContext } from "./stream-inspection.types";

export type StreamTrackAlertRule = RuntimeAlertRule<StreamTrack[], StreamTrackAlertContext>;
