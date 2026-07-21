import { selectByHash, selectLeastLoaded } from "@/common";

describe("selectByHash", () => {
    it("throws when there are no candidates", () => {
        expect(() => selectByHash("s", [])).toThrow("Cannot select: no candidates provided");
    });

    it("returns the sole candidate regardless of key", () => {
        expect(selectByHash("anything", ["only"])).toBe("only");
        expect(selectByHash("", ["only"])).toBe("only");
    });

    it("is deterministic for the same key and candidate order", () => {
        const pods = ["pod-0", "pod-1", "pod-2"];
        expect(selectByHash("cam", pods)).toBe(selectByHash("cam", pods));
    });

    it("always returns one of the candidates, even for negative/overflowing hashes", () => {
        const pods = ["pod-0", "pod-1", "pod-2", "pod-3"];
        expect(pods).toContain(selectByHash("a".repeat(100), pods));
        expect(pods).toContain(selectByHash("α", pods));
    });

    it("distributes distinct keys across candidates", () => {
        const pods = ["pod-0", "pod-1", "pod-2"];
        // hash('a')=97→1, hash('b')=98→2, hash('c')=99→0
        expect(selectByHash("a", pods)).toBe("pod-1");
        expect(selectByHash("b", pods)).toBe("pod-2");
        expect(selectByHash("c", pods)).toBe("pod-0");
    });
});

describe("selectLeastLoaded", () => {
    it("throws when there are no candidates", () => {
        expect(() => selectLeastLoaded([])).toThrow("Cannot select: no candidates provided");
    });

    it("picks the candidate with the least load", () => {
        const chosen = selectLeastLoaded([
            { id: "a", load: 5 },
            { id: "b", load: 1 },
            { id: "c", load: 3 },
        ]);
        expect(chosen).toBe("b");
    });

    it("breaks ties on load by id for determinism", () => {
        const chosen = selectLeastLoaded([
            { id: "b", load: 2 },
            { id: "a", load: 2 },
        ]);
        expect(chosen).toBe("a");
    });
});
