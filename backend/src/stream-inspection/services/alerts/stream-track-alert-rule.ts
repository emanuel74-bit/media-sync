import { RuntimeAlertRule } from "../../../common/rules";
import { StreamTrack, StreamTrackAlertContext } from "../../domain";

export type StreamTrackAlertRule = RuntimeAlertRule<StreamTrack[], StreamTrackAlertContext>;
