import { MediaMtxStreamInfo, V3PathItem, V3TrackItem } from "../types";

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
        metadata: {
            bytesReceived: path?.bytesReceived,
            bytesSent: path?.bytesSent,
            readers: path?.readers,
        },
    };
}
