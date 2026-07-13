import { escapeRegExp, buildProtocolPattern } from "@/common";

describe("escapeRegExp", () => {
    it("escapes regex metacharacters so the string matches literally", () => {
        const escaped = escapeRegExp("a.b+c(d)");
        expect(new RegExp(escaped).test("a.b+c(d)")).toBe(true);
        expect(new RegExp(escaped).test("axbxcxd")).toBe(false);
    });

    it("leaves a plain protocol token unchanged in effect", () => {
        expect(new RegExp(`^(${escapeRegExp("rtsp")})://`).test("rtsp://host")).toBe(true);
    });
});

describe("buildProtocolPattern", () => {
    it("matches only the listed protocols, case-insensitively, at the start", () => {
        const pattern = buildProtocolPattern(["rtsp", "srt"]);
        expect(pattern.test("RTSP://host/path")).toBe(true);
        expect(pattern.test("srt://host")).toBe(true);
        expect(pattern.test("rtmp://host")).toBe(false);
        expect(pattern.test("prefix rtsp://host")).toBe(false);
    });

    it("escapes protocol tokens so metacharacters are literal", () => {
        const pattern = buildProtocolPattern(["r.p"]);
        expect(pattern.test("r.p://host")).toBe(true);
        expect(pattern.test("rxp://host")).toBe(false);
    });
});
