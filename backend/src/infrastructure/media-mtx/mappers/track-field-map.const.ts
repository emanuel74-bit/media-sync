import { StreamTrack, TrackType } from "@/common";

import { V3TrackItem } from "../types";

/** Fields that exist on both the V3 track shape and the domain StreamTrack. */
export type CopyableTrackField = Exclude<Extract<keyof V3TrackItem, keyof StreamTrack>, "type">;

/**
 * Which V3 track fields each track type carries into the domain StreamTrack.
 * Supporting a new track type = add the TrackType enum member and one row here.
 */
export const TRACK_FIELD_MAP: Readonly<Record<TrackType, readonly CopyableTrackField[]>> = {
    [TrackType.VIDEO]: ["codec", "width", "height", "fps"],
    [TrackType.AUDIO]: ["codec", "channels", "sampleRate", "language"],
    [TrackType.DATA]: ["codec", "language"],
    [TrackType.SUBTITLE]: ["codec", "language"],
};
