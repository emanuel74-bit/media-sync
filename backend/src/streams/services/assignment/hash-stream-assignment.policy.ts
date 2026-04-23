import { Injectable } from "@nestjs/common";

import { StreamAssignmentPolicy } from "./stream-assignment.policy";

/**
 * Deterministically assigns a stream to a pod using consistent hashing.
 * Uses a djb2-style hash so the same stream name always maps to the same pod
 * as long as the pod list order is stable.
 */
@Injectable()
export class HashStreamAssignmentPolicy extends StreamAssignmentPolicy {
    selectPod(streamName: string, candidatePodIds: readonly string[]): string {
        if (!candidatePodIds.length) {
            throw new Error("Cannot assign stream: no candidate pods provided");
        }
        let hash = 0;
        for (let i = 0; i < streamName.length; i++) {
            hash = (hash << 5) - hash + streamName.charCodeAt(i);
            hash |= 0;
        }
        return candidatePodIds[Math.abs(hash) % candidatePodIds.length];
    }
}
