/** A single media track entry inside a V3 path item. */
export interface V3TrackItem {
    type: "video" | "audio" | "data" | "subtitle" | string;
    codec?: string;
    width?: number;
    height?: number;
    fps?: number;
    channels?: number;
    sampleRate?: number;
    language?: string;
}
