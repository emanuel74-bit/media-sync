import { StreamTrack } from "../../../common/domain";
import { V3TrackItem } from "../../../infrastructure";

export interface TrackParser {
    canParse(type: string): boolean;
    parse(track: V3TrackItem): StreamTrack;
}
