import { StreamTrack } from "../../../common/domain";
import { StreamTrackAlertContext } from "../../domain";
import { RuntimeAlertRule } from "../../../common/rules";

export type StreamTrackAlertRule = RuntimeAlertRule<StreamTrack[], StreamTrackAlertContext>;
