import { StreamTrack } from "../../domain";
import { V3TrackItem } from "../../../infrastructure/media-mtx/types";

export interface TrackParser {
    canParse(type: string): boolean;
    parse(track: V3TrackItem): StreamTrack;
}
