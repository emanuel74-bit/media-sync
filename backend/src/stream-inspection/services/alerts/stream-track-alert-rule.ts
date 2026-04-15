import { RuntimeAlertRule } from "../../../common";
import { StreamTrack, StreamTrackAlertContext } from "../../domain";

export type StreamTrackAlertRule = RuntimeAlertRule<StreamTrack[], StreamTrackAlertContext>;
