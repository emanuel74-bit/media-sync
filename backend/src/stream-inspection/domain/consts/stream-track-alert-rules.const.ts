import { StreamTrackAlertRule } from "../types/stream-track-alert-rule.types";
import { AlertSeverity, AlertType, TrackType } from "../../../common/domain";

export const STREAM_TRACK_ALERT_RULES: StreamTrackAlertRule[] = [
    {
        check: (tracks, stream) =>
            stream.metadata?.hasExpectedVideo !== false &&
            !tracks.some((track) => track.type === TrackType.VIDEO),
        type: AlertType.MISSING_VIDEO_TRACK,
        severity: AlertSeverity.WARNING,
        message: () => "Expected video track is missing from stream",
    },
    {
        check: (tracks, stream) =>
            stream.metadata?.hasExpectedAudio !== false &&
            !tracks.some((track) => track.type === TrackType.AUDIO),
        type: AlertType.MISSING_AUDIO_TRACK,
        severity: AlertSeverity.WARNING,
        message: () => "Expected audio track is missing from stream",
    },
    {
        check: (tracks) => tracks.some((track) => !Object.values(TrackType).includes(track.type)),
        type: AlertType.UNEXPECTED_TRACK_TYPES,
        severity: AlertSeverity.INFO,
        message: (tracks) =>
            `Found unexpected track types: ${tracks
                .filter((track) => !Object.values(TrackType).includes(track.type))
                .map((track) => track.type)
                .join(", ")}`,
    },
];
