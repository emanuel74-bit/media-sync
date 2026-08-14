import { PublicStream, Stream } from "../domain";

/** Project an internal stream into the credential-free general REST representation. */
export function mapStreamToPublicStream(stream: Stream): PublicStream {
    return {
        name: stream.name,
        source: stream.source,
        status: stream.status,
        metadata: stream.metadata,
        isEnabled: stream.isEnabled,
        lastSeenAt: stream.lastSeenAt,
        lastSyncedAt: stream.lastSyncedAt,
        lastError: stream.lastError,
        activeConsumers: stream.activeConsumers,
        isManual: stream.isManual,
        ingestNode: stream.ingestNode,
        reservedUntil: stream.reservedUntil,
        assignedNode: stream.assignedNode,
        assignedAt: stream.assignedAt,
        createdAt: stream.createdAt,
        updatedAt: stream.updatedAt,
    };
}
