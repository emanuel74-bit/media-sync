import { V3PathItem, V3TrackItem, MediaMtxStreamInfo } from "@/infrastructure";

import { mapV3PathToMetadata } from "./map-v3-path-to-metadata.mapper";

export function mapV3PathToStream(path: V3PathItem): MediaMtxStreamInfo {
    const trackList: V3TrackItem[] = Array.isArray(path?.tracks) ? path.tracks : [];
    const videoTrack = trackList.find((track) => track?.type === "video");
    const audioTrack = trackList.find((track) => track?.type === "audio");

    return {
        name: path?.name ?? "unknown",
        source: path?.source ?? "unknown",
        status: path?.ready ? "ready" : "inactive",
        video: videoTrack
            ? {
                  codec: videoTrack.codec ?? "",
                  width: videoTrack.width ?? 0,
                  height: videoTrack.height ?? 0,
                  fps: videoTrack.fps ?? 0,
              }
            : undefined,
        audio: audioTrack
            ? {
                  codec: audioTrack.codec ?? "",
                  channels: audioTrack.channels ?? 0,
                  sampleRate: audioTrack.sampleRate ?? 0,
              }
            : undefined,
        metadata: mapV3PathToMetadata(path),
    };
}
