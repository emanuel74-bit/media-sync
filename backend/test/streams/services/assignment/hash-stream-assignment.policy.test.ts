import { HashStreamAssignmentPolicy } from "@/streams/services/assignment/hash-stream-assignment.policy";

describe("HashStreamAssignmentPolicy", () => {
    let policy: HashStreamAssignmentPolicy;

    beforeEach(() => {
        policy = new HashStreamAssignmentPolicy();
    });

    // -------------------------------------------------------------------------
    // Guard: empty candidate list
    // -------------------------------------------------------------------------
    describe("selectPod — guard", () => {
        it("throws when candidatePodIds is empty", () => {
            expect(() => policy.selectPod("stream-a", [])).toThrow(
                "Cannot assign stream: no candidate pods provided",
            );
        });
    });

    // -------------------------------------------------------------------------
    // Single-pod list: must always return the only candidate
    // -------------------------------------------------------------------------
    describe("selectPod — single candidate", () => {
        it("returns the sole candidate regardless of stream name", () => {
            expect(policy.selectPod("stream-a", ["only-pod"])).toBe("only-pod");
            expect(policy.selectPod("stream-xyz-very-long", ["only-pod"])).toBe("only-pod");
            expect(policy.selectPod("", ["only-pod"])).toBe("only-pod");
        });
    });

    // -------------------------------------------------------------------------
    // Output must be one of the provided candidates
    // -------------------------------------------------------------------------
    describe("selectPod — result in candidates", () => {
        const pods = ["pod-a", "pod-b", "pod-c", "pod-d"];

        it("always returns a value present in candidatePodIds", () => {
            const names = ["live", "cam/front", "studio-1", "stream_099", "α"];
            for (const name of names) {
                expect(pods).toContain(policy.selectPod(name, pods));
            }
        });
    });

    // -------------------------------------------------------------------------
    // Determinism: identical inputs must produce identical outputs
    // -------------------------------------------------------------------------
    describe("selectPod — determinism", () => {
        const pods = ["pod-0", "pod-1", "pod-2"];

        it("returns the same pod for the same stream name on repeated calls", () => {
            const first = policy.selectPod("stream-a", pods);
            const second = policy.selectPod("stream-a", pods);
            const third = policy.selectPod("stream-a", pods);
            expect(first).toBe(second);
            expect(second).toBe(third);
        });

        it("returns consistent results across separate policy instances", () => {
            const other = new HashStreamAssignmentPolicy();
            for (const name of ["live", "cam-2", "event/main"]) {
                expect(policy.selectPod(name, pods)).toBe(other.selectPod(name, pods));
            }
        });
    });

    // -------------------------------------------------------------------------
    // Distribution: different stream names must not all hash to the same pod
    // Single-char names 'a', 'b', 'c' have known distinct hashes (97, 98, 99)
    // so each maps to a different index mod 3.
    // -------------------------------------------------------------------------
    describe("selectPod — distribution", () => {
        const pods = ["pod-0", "pod-1", "pod-2"];

        it("maps single-char stream names 'a','b','c' to three distinct pods", () => {
            // hash('a')=97 → 97%3=1 → pod-1
            // hash('b')=98 → 98%3=2 → pod-2
            // hash('c')=99 → 99%3=0 → pod-0
            const results = new Set(["a", "b", "c"].map((n) => policy.selectPod(n, pods)));
            expect(results.size).toBe(3);
        });

        it("maps stream 'a' to pod-1, 'b' to pod-2, 'c' to pod-0 with a 3-pod list", () => {
            expect(policy.selectPod("a", pods)).toBe("pod-1");
            expect(policy.selectPod("b", pods)).toBe("pod-2");
            expect(policy.selectPod("c", pods)).toBe("pod-0");
        });
    });

    // -------------------------------------------------------------------------
    // Negative hash values: Math.abs must prevent a negative modulo result
    // -------------------------------------------------------------------------
    describe("selectPod — negative hash guard", () => {
        it("never throws or returns undefined for stream names that produce negative hashes", () => {
            // Long strings can produce negative 32-bit hashes; the policy must handle them.
            const longName = "a".repeat(100);
            const pods = ["pod-0", "pod-1", "pod-2"];
            const result = policy.selectPod(longName, pods);
            expect(pods).toContain(result);
        });

        it("returns a valid pod even when the hash overflows int32", () => {
            const overflowName = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // 31 chars
            const pods = ["pod-0", "pod-1", "pod-2", "pod-3"];
            const result = policy.selectPod(overflowName, pods);
            expect(pods).toContain(result);
        });
    });

    // -------------------------------------------------------------------------
    // Stable assignment when pod list grows (new pods appended)
    // -------------------------------------------------------------------------
    describe("selectPod — pod list growth", () => {
        it("may change assignment when the pod list grows, but remains deterministic for a given list", () => {
            const pods3 = ["pod-0", "pod-1", "pod-2"];
            const pods4 = ["pod-0", "pod-1", "pod-2", "pod-3"];

            // Same stream, same list → always the same result
            const with3 = policy.selectPod("stream-stable", pods3);
            expect(policy.selectPod("stream-stable", pods3)).toBe(with3);

            const with4 = policy.selectPod("stream-stable", pods4);
            expect(policy.selectPod("stream-stable", pods4)).toBe(with4);

            // Both results are valid candidates
            expect(pods3).toContain(with3);
            expect(pods4).toContain(with4);
        });
    });
});
