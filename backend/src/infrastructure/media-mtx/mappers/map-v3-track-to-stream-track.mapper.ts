import { StreamTrack, TrackType } from "@/common";

import { V3TrackItem } from "../types";
import { TRACK_FIELD_MAP } from "./track-field-map.const";

/** Maps one V3 track to a domain StreamTrack; returns null for unrecognised track types. */
export function mapV3TrackToStreamTrack(track: V3TrackItem): StreamTrack | null {
    const type = track.type as TrackType;
    const fields = TRACK_FIELD_MAP[type];
    if (!fields) {
        return null;
    }

    const mapped: StreamTrack = { type };
    for (const field of fields) {
        if (track[field] !== undefined) {
            Object.assign(mapped, { [field]: track[field] });
        }
    }
    return mapped;
}

export function mapV3TracksToStreamTracks(tracks?: V3TrackItem[]): StreamTrack[] {
    return (tracks ?? [])
        .map((track) => mapV3TrackToStreamTrack(track))
        .filter((track): track is StreamTrack => track !== null);
}
