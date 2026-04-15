/**
 * Deterministically assigns a stream to a pod using consistent hashing.
 * Uses a djb2-style hash so the same stream name always maps to the same pod
 * as long as the pod list order is stable.
 *
 * @param streamName - The unique name of the stream to assign
 * @param podIds     - Ordered list of candidate pod IDs
 * @returns          The pod ID that the stream should be assigned to
 * @throws           If `podIds` is empty
 */
export function hashStreamToPod(streamName: string, podIds: string[]): string {
    if (!podIds.length) {
        throw new Error("Cannot assign stream: no candidate pods provided");
    }
    let hash = 0;
    for (let i = 0; i < streamName.length; i++) {
        hash = (hash << 5) - hash + streamName.charCodeAt(i);
        hash |= 0;
    }
    return podIds[Math.abs(hash) % podIds.length];
}
