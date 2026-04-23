import { TrackType } from "@/common";
import { DataTrackParser } from "@/stream-inspection";
import { VideoTrackParser } from "@/stream-inspection";
import { AudioTrackParser } from "@/stream-inspection";
import { SubtitleTrackParser } from "@/stream-inspection";
import { V3PathItem, V3TrackItem } from "@/infrastructure";
import { parseTracksFromPathItem } from "@/stream-inspection";

// ─── Individual parser unit tests ────────────────────────────────────────────

describe("VideoTrackParser", () => {
    const parser = new VideoTrackParser();

    it("parses a video track into a StreamTrack", () => {
        const track: V3TrackItem = {
            type: "video",
            codec: "H264",
            width: 1920,
            height: 1080,
            fps: 30,
        };
        const result = parser.parse(track);
        expect(result).toEqual({
            type: TrackType.VIDEO,
            codec: "H264",
            width: 1920,
            height: 1080,
            fps: 30,
        });
    });

    it("maps undefined optional fields as undefined", () => {
        const result = parser.parse({ type: "video" });
        expect(result.codec).toBeUndefined();
        expect(result.width).toBeUndefined();
    });
});

describe("AudioTrackParser", () => {
    const parser = new AudioTrackParser();

    it("parses an audio track", () => {
        const track: V3TrackItem = {
            type: "audio",
            codec: "AAC",
            channels: 2,
            sampleRate: 48000,
            language: "en",
        };
        const result = parser.parse(track);
        expect(result).toEqual({
            type: TrackType.AUDIO,
            codec: "AAC",
            channels: 2,
            sampleRate: 48000,
            language: "en",
        });
    });
});

describe("DataTrackParser", () => {
    const parser = new DataTrackParser();

    it("parses a data track", () => {
        const track: V3TrackItem = { type: "data", codec: "SCTE35" };
        const result = parser.parse(track);
        expect(result).toEqual({ type: TrackType.DATA, codec: "SCTE35", language: undefined });
    });
});

describe("SubtitleTrackParser", () => {
    const parser = new SubtitleTrackParser();

    it("parses a subtitle track", () => {
        const track: V3TrackItem = { type: "subtitle", codec: "SRT", language: "fr" };
        const result = parser.parse(track);
        expect(result).toEqual({ type: TrackType.SUBTITLE, codec: "SRT", language: "fr" });
    });
});

// ─── parseTracksFromPathItem integration ─────────────────────────────────────

describe("parseTracksFromPathItem", () => {
    it("returns an empty array for a path item with no tracks", () => {
        const item: V3PathItem = {};
        expect(parseTracksFromPathItem(item)).toEqual([]);
    });

    it("returns an empty array when tracks is an empty array", () => {
        const item: V3PathItem = { tracks: [] };
        expect(parseTracksFromPathItem(item)).toEqual([]);
    });

    it("parses a single video track", () => {
        const item: V3PathItem = {
            tracks: [{ type: "video", codec: "H265", width: 3840, height: 2160, fps: 60 }],
        };
        const result = parseTracksFromPathItem(item);
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe(TrackType.VIDEO);
    });

    it("parses multiple tracks of different types", () => {
        const item: V3PathItem = {
            tracks: [
                { type: "video", codec: "H264" },
                { type: "audio", codec: "AAC", channels: 2, sampleRate: 44100 },
                { type: "data" },
            ],
        };
        const result = parseTracksFromPathItem(item);
        expect(result).toHaveLength(3);
        expect(result.map((t) => t.type)).toEqual([
            TrackType.VIDEO,
            TrackType.AUDIO,
            TrackType.DATA,
        ]);
    });

    it("skips tracks with an unrecognised type", () => {
        const item: V3PathItem = {
            tracks: [{ type: "unknown-type" }, { type: "video", codec: "H264" }],
        };
        const result = parseTracksFromPathItem(item);
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe(TrackType.VIDEO);
    });

    it("parses all four supported track types together", () => {
        const item: V3PathItem = {
            tracks: [{ type: "video" }, { type: "audio" }, { type: "data" }, { type: "subtitle" }],
        };
        const result = parseTracksFromPathItem(item);
        expect(result).toHaveLength(4);
    });
});
