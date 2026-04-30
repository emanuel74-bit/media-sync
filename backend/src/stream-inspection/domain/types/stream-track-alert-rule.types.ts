import { StreamTrack } from "@/common";
import { RuntimeAlertRule } from "@/alerts";

import { StreamTrackAlertContext } from "./stream-inspection.types";

export type StreamTrackAlertRule = RuntimeAlertRule<StreamTrack[], StreamTrackAlertContext>;
