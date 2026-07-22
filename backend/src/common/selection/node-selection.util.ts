/**
 * Context-free node-selection algorithms. Given plain candidates, return the chosen id — no
 * knowledge of MediaMTX, nodes, streams, or persistence. The domain services gather the inputs
 * and act on the result; these just decide.
 */

/** A candidate with the load counting against it. */
export interface LoadedCandidate {
    id: string;
    load: number;
}

/**
 * Deterministically map a key to one candidate by hashing the key (djb2-style), so the same key
 * always resolves to the same candidate while the candidate order is stable.
 */
export function selectByHash(key: string, candidateIds: readonly string[]): string {
    if (!candidateIds.length) {
        throw new Error("Cannot select: no candidates provided");
    }

    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = (hash << 5) - hash + key.charCodeAt(i);
        hash |= 0;
    }

    const index = Math.abs(hash) % candidateIds.length;
    return candidateIds[index];
}

/** Pick the least-loaded candidate, breaking ties by id for a deterministic result. */
export function selectLeastLoaded(candidates: readonly LoadedCandidate[]): string {
    if (!candidates.length) {
        throw new Error("Cannot select: no candidates provided");
    }

    const sorted = [...candidates].sort((a, b) => a.load - b.load || a.id.localeCompare(b.id));
    return sorted[0].id;
}
