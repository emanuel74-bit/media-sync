import { TrackType } from "@/common";
import { V3PathItem, V3TrackItem } from "@/infrastructure/media-mtx";
import {
    TRACK_FIELD_MAP,
    mapV3TrackToStreamTrack,
    mapV3PathToStreamDetails,
    mapV3TracksToStreamTracks,
} from "@/infrastructure/media-mtx";

// ─── mapV3TrackToStreamTrack ─────────────────────────────────────────────────

describe("mapV3TrackToStreamTrack", () => {
    it("maps a video track with its mapped fields", () => {
        const track: V3TrackItem = {
            type: "video",
            codec: "H264",
            width: 1920,
            height: 1080,
            fps: 30,
        };
        expect(mapV3TrackToStreamTrack(track)).toEqual({
            type: TrackType.VIDEO,
            codec: "H264",
            width: 1920,
            height: 1080,
            fps: 30,
        });
    });

    it("maps an audio track with its mapped fields", () => {
        const track: V3TrackItem = {
            type: "audio",
            codec: "AAC",
            channels: 2,
            sampleRate: 48000,
            language: "en",
        };
        expect(mapV3TrackToStreamTrack(track)).toEqual({
            type: TrackType.AUDIO,
            codec: "AAC",
            channels: 2,
            sampleRate: 48000,
            language: "en",
        });
    });

    it("maps data and subtitle tracks", () => {
        expect(mapV3TrackToStreamTrack({ type: "data", codec: "SCTE35" })).toEqual({
            type: TrackType.DATA,
            codec: "SCTE35",
        });
        expect(mapV3TrackToStreamTrack({ type: "subtitle", codec: "SRT", language: "fr" })).toEqual(
            {
                type: TrackType.SUBTITLE,
                codec: "SRT",
                language: "fr",
            },
        );
    });

    it("omits fields that are undefined on the source track", () => {
        const mapped = mapV3TrackToStreamTrack({ type: "video" });
        expect(mapped).toEqual({ type: TrackType.VIDEO });
    });

    it("does not copy fields outside the track type's field map", () => {
        const mapped = mapV3TrackToStreamTrack({ type: "data", width: 1920, channels: 2 });
        expect(mapped).toEqual({ type: TrackType.DATA });
    });

    it("returns null for an unrecognised track type", () => {
        expect(mapV3TrackToStreamTrack({ type: "unknown-type" })).toBeNull();
    });

    it("has a field map row for every TrackType member", () => {
        for (const type of Object.values(TrackType)) {
            expect(TRACK_FIELD_MAP[type]).toBeDefined();
        }
    });
});

// ─── mapV3TracksToStreamTracks ───────────────────────────────────────────────

describe("mapV3TracksToStreamTracks", () => {
    it("returns an empty array for undefined or empty input", () => {
        expect(mapV3TracksToStreamTracks(undefined)).toEqual([]);
        expect(mapV3TracksToStreamTracks([])).toEqual([]);
    });

    it("maps all four supported track types together", () => {
        const result = mapV3TracksToStreamTracks([
            { type: "video" },
            { type: "audio" },
            { type: "data" },
            { type: "subtitle" },
        ]);
        expect(result.map((track) => track.type)).toEqual([
            TrackType.VIDEO,
            TrackType.AUDIO,
            TrackType.DATA,
            TrackType.SUBTITLE,
        ]);
    });

    it("skips tracks with an unrecognised type", () => {
        const result = mapV3TracksToStreamTracks([
            { type: "unknown-type" },
            { type: "video", codec: "H264" },
        ]);
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe(TrackType.VIDEO);
    });
});

// ─── mapV3PathToStreamDetails ────────────────────────────────────────────────

describe("mapV3PathToStreamDetails", () => {
    it("maps a full path item into domain StreamDetails", () => {
        const path: V3PathItem = {
            name: "stream-a",
            bytesReceived: 1024,
            bytesSent: 512,
            readers: 2,
            tracks: [{ type: "video", codec: "H265", width: 3840, height: 2160, fps: 60 }],
        };
        expect(mapV3PathToStreamDetails("stream-a", path)).toEqual({
            streamName: "stream-a",
            tracks: [{ type: TrackType.VIDEO, codec: "H265", width: 3840, height: 2160, fps: 60 }],
            metadata: { bytesReceived: 1024, bytesSent: 512, readers: 2 },
        });
    });

    it("falls back to the requested stream name when the path has none", () => {
        const details = mapV3PathToStreamDetails("requested-name", {});
        expect(details.streamName).toBe("requested-name");
        expect(details.tracks).toEqual([]);
    });
});
