import { Injectable, NotFoundException } from "@nestjs/common";

import { StreamStatus } from "@/common";

import { Stream } from "../../domain";
import { StreamRepository } from "../../repositories";

@Injectable()
export class StreamStatusService {
    constructor(private readonly streamRepository: StreamRepository) {}

    async upsertFromDiscovery(info: Partial<Stream> & { name: string }): Promise<Stream> {
        return this.streamRepository.upsert(info.name, {
            ...info,
            isManual: false,
        });
    }

    async markStale(name: string): Promise<void> {
        await this.streamRepository.update(name, {
            status: StreamStatus.STALE,
            lastSeenAt: new Date(),
        });
    }

    async markSynced(name: string): Promise<Stream> {
        return this.applyStatus(name, {
            status: StreamStatus.SYNCED,
            lastSyncedAt: new Date(),
            lastError: null,
        });
    }

    async markSyncError(name: string, error: string): Promise<Stream> {
        return this.applyStatus(name, {
            status: StreamStatus.SYNC_ERROR,
            lastError: error,
        });
    }

    async markPendingAssignment(name: string, reason: string): Promise<Stream> {
        return this.applyStatus(name, {
            status: StreamStatus.PENDING_ASSIGNMENT,
            lastError: reason,
        });
    }

    /** Apply a status transition and return the updated stream, or throw if it no longer exists. */
    private async applyStatus(name: string, data: Partial<Stream>): Promise<Stream> {
        const updated = await this.streamRepository.update(name, data);
        if (!updated) {
            throw new NotFoundException(`Stream ${name} not found`);
        }
        return updated;
    }
}
