import type { V3PathItem } from "@/infrastructure";
import { mapV3PathToStream } from "@/infrastructure";

describe("mapV3PathToStream — source description", () => {
    it("describes the real v3 object source by its type", () => {
        const path = {
            name: "live",
            source: { type: "rtspSession", id: "abc" },
            ready: true,
        } as unknown as V3PathItem;

        expect(mapV3PathToStream(path).source).toBe("rtspSession");
    });

    it("maps a null source (path not ready) to 'unknown'", () => {
        const path = { name: "live", source: null, ready: false } as unknown as V3PathItem;

        expect(mapV3PathToStream(path).source).toBe("unknown");
        expect(mapV3PathToStream(path).status).toBe("inactive");
    });

    it("tolerates a bare string source", () => {
        const path = { name: "live", source: "rtsp://x/y" } as unknown as V3PathItem;

        expect(mapV3PathToStream(path).source).toBe("rtsp://x/y");
    });

    it("normalizes a v3 readers array to a count in metadata", () => {
        const path = {
            name: "live",
            source: { type: "rtspSession" },
            readers: [{ type: "hlsMuxer" }, { type: "rtspSession" }],
        } as unknown as V3PathItem;

        expect(mapV3PathToStream(path).metadata?.readers).toBe(2);
    });
});
