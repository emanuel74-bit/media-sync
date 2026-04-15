import { StreamTrackAlertRule } from "./stream-track-alert-rule";
import { AlertSeverity, AlertType, TrackType } from "../../../common";

export const STREAM_TRACK_ALERT_RULES: StreamTrackAlertRule[] = [
    {
        check: (tracks, stream) =>
            stream.metadata?.expectedVideo !== false &&
            !tracks.some((t) => t.type === TrackType.VIDEO),
        type: AlertType.MISSING_VIDEO_TRACK,
        severity: AlertSeverity.WARNING,
        message: () => "Expected video track is missing from stream",
    },
    {
        check: (tracks, stream) =>
            stream.metadata?.expectedAudio !== false &&
            !tracks.some((t) => t.type === TrackType.AUDIO),
        type: AlertType.MISSING_AUDIO_TRACK,
        severity: AlertSeverity.WARNING,
        message: () => "Expected audio track is missing from stream",
    },
    {
        check: (tracks) => tracks.some((t) => !Object.values(TrackType).includes(t.type)),
        type: AlertType.UNEXPECTED_TRACK_TYPES,
        severity: AlertSeverity.INFO,
        message: (tracks) =>
            `Found unexpected track types: ${tracks
                .filter((t) => !Object.values(TrackType).includes(t.type))
                .map((t) => t.type)
                .join(", ")}`,
    },
];
