import { StreamTrack } from "../../../domain";
import { TrackType } from "../../../../common";
import { V3TrackItem } from "../../../../infrastructure/media-mtx/types";
import { TrackParser } from "./track-parser.interface";

export class DataTrackParser implements TrackParser {
    canParse(type: string): boolean {
        return type === TrackType.DATA;
    }

    parse(track: V3TrackItem): StreamTrack {
        return {
            type: TrackType.DATA,
            codec: track.codec,
            language: track.language,
        };
    }
}
