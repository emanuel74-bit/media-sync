import { StreamDetails, V3PathItem } from "../types";
import { mapV3PathToMetadata } from "./map-v3-path-to-metadata.mapper";
import { mapV3TracksToStreamTracks } from "./map-v3-track-to-stream-track.mapper";

export function mapV3PathToStreamDetails(streamName: string, path: V3PathItem): StreamDetails {
    return {
        streamName: path.name ?? streamName,
        tracks: mapV3TracksToStreamTracks(path.tracks),
        metadata: mapV3PathToMetadata(path),
    };
}
