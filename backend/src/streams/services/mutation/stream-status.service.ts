import { Injectable } from "@nestjs/common";

import { Stream } from "@/streams";
import { StreamStatus } from "@/common";
import { StreamRepository } from "@/streams";

@Injectable()
export class StreamStatusService {
    constructor(private readonly streamRepository: StreamRepository) {}

    async upsertFromDiscovery(info: Partial<Stream> & { name: string }): Promise<Stream> {
        return this.streamRepository.upsert(info.name, {
            ...info,
            isManual: false,
        });
    }

    async markSynced(name: string): Promise<void> {
        await this.streamRepository.update(name, {
            status: StreamStatus.SYNCED,
            lastSyncedAt: new Date(),
            lastError: null,
        });
    }

    async markSyncError(name: string, error: string): Promise<void> {
        await this.streamRepository.update(name, {
            status: StreamStatus.SYNC_ERROR,
            lastError: error,
        });
    }

    async markStale(name: string): Promise<void> {
        await this.streamRepository.update(name, {
            status: StreamStatus.STALE,
            lastSeenAt: new Date(),
        });
    }
}
