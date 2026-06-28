import { StreamTrack, RuntimeAlertRule } from "@/common";

import { StreamTrackAlertContext } from "./stream-track-alert-context.types";

/** Content rules over a stream's inspected tracks (source: inspection). */
export type StreamTrackAlertRule = RuntimeAlertRule<StreamTrack[], StreamTrackAlertContext>;
