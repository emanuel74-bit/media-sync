import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import { StreamStatus } from "@/common";

import { StreamRepository } from "../../repositories";
import { STREAM_STATUS_TRANSITIONS, Stream } from "../../domain";

@Injectable()
export class StreamStatusService {
    constructor(private readonly streamRepository: StreamRepository) {}

    async upsertFromDiscovery(info: Partial<Stream> & { name: string }): Promise<Stream> {
        const { status: _observedStatus, ...observation } = info;
        const current = await this.streamRepository.findByName(info.name);
        const discoveryData: Partial<Stream> = {
            ...observation,
            isManual: false,
            reservedUntil: null,
            publishToken: null,
        };

        const currentStatus: unknown = current?.status;
        const startsDiscovery =
            current &&
            (!this.isKnownStatus(currentStatus) ||
                currentStatus === StreamStatus.RESERVED ||
                currentStatus === StreamStatus.STALE);

        if (startsDiscovery) {
            const discovered = await this.streamRepository.transitionStatus(
                info.name,
                String(currentStatus),
                {
                    ...discoveryData,
                    lastError: null,
                    status: StreamStatus.DISCOVERED,
                },
            );
            if (discovered) {
                return discovered;
            }

            // A concurrent worker may already have advanced beyond DISCOVERED. Refresh the
            // observation without writing status so the newer lifecycle state wins.
            return this.streamRepository.upsert(info.name, discoveryData);
        }

        return this.streamRepository.upsert(info.name, {
            ...discoveryData,
        });
    }

    async markAssigned(name: string, nodeId: string): Promise<Stream> {
        return this.applyStatus(name, StreamStatus.ASSIGNED, {
            assignedNode: nodeId,
            assignedAt: new Date(),
            lastError: null,
        });
    }

    async markUnassigned(name: string, reason: string): Promise<Stream> {
        return this.applyStatus(name, StreamStatus.PENDING_ASSIGNMENT, {
            assignedNode: null,
            assignedAt: null,
            lastError: reason,
        });
    }

    async markStale(name: string): Promise<void> {
        await this.applyStatus(name, StreamStatus.STALE);
    }

    async markSynced(name: string): Promise<Stream> {
        return this.applyStatus(name, StreamStatus.SYNCED, {
            lastSyncedAt: new Date(),
            lastError: null,
        });
    }

    async markSyncError(name: string, error: string): Promise<Stream> {
        return this.applyStatus(name, StreamStatus.SYNC_ERROR, {
            lastError: error,
        });
    }

    async markPendingAssignment(name: string, reason: string): Promise<Stream> {
        return this.applyStatus(name, StreamStatus.PENDING_ASSIGNMENT, {
            lastError: reason,
        });
    }

    async transitionTo(
        name: string,
        status: StreamStatus,
        data: Partial<Stream> = {},
    ): Promise<Stream> {
        return this.applyStatus(name, status, data);
    }

    /** Validate and atomically apply one lifecycle move, retrying once after a concurrent move. */
    private async applyStatus(
        name: string,
        status: StreamStatus,
        data: Partial<Stream> = {},
        isRetry = false,
    ): Promise<Stream> {
        const current = await this.streamRepository.findByName(name);
        if (!current) {
            throw new NotFoundException(`Stream ${name} not found`);
        }
        if (!this.isKnownStatus(current.status)) {
            throw new ConflictException(
                `Stream ${name} has unknown persisted status: ${String(current.status)}`,
            );
        }

        const isIdempotent = current.status === status;
        const isAllowed = STREAM_STATUS_TRANSITIONS[current.status].includes(status);
        if (!isIdempotent && !isAllowed) {
            throw new ConflictException(
                `Invalid stream status transition for ${name}: ${current.status} -> ${status}`,
            );
        }

        const updated = await this.streamRepository.transitionStatus(name, current.status, {
            ...data,
            status,
        });
        if (updated) {
            return updated;
        }
        if (!isRetry) {
            return this.applyStatus(name, status, data, true);
        }
        throw new ConflictException(`Stream ${name} changed during its status transition`);
    }

    private isKnownStatus(status: unknown): status is StreamStatus {
        return Object.values(StreamStatus).includes(status as StreamStatus);
    }
}
