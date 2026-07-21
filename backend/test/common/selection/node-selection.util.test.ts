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
        const nodes = ["node-0", "node-1", "node-2"];
        expect(selectByHash("cam", nodes)).toBe(selectByHash("cam", nodes));
    });

    it("always returns one of the candidates, even for negative/overflowing hashes", () => {
        const nodes = ["node-0", "node-1", "node-2", "node-3"];
        expect(nodes).toContain(selectByHash("a".repeat(100), nodes));
        expect(nodes).toContain(selectByHash("α", nodes));
    });

    it("distributes distinct keys across candidates", () => {
        const nodes = ["node-0", "node-1", "node-2"];
        // hash('a')=97→1, hash('b')=98→2, hash('c')=99→0
        expect(selectByHash("a", nodes)).toBe("node-1");
        expect(selectByHash("b", nodes)).toBe("node-2");
        expect(selectByHash("c", nodes)).toBe("node-0");
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
