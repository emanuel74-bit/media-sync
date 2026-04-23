/**
 * Defines the contract for selecting a pod to assign to a stream.
 * Used as an injection token so callers depend on the abstraction,
 * not on any specific selection algorithm.
 */
export abstract class StreamAssignmentPolicy {
    /**
     * Select a pod from the provided candidates for the given stream.
     *
     * @param streamName       - The unique name of the stream to assign
     * @param candidatePodIds  - Non-empty ordered list of eligible pod IDs
     * @returns                The pod ID that the stream should be assigned to
     * @throws                 If `candidatePodIds` is empty
     */
    abstract selectPod(streamName: string, candidatePodIds: readonly string[]): string;
}
