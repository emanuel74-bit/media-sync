import { Injectable, Logger } from "@nestjs/common";

import { StreamStatus } from "@/common";
import { Stream, StreamsFacadeService } from "@/streams";

import { SyncContext } from "../../domain";

@Injectable()
export class StreamStalenessService {
    private readonly logger = new Logger(StreamStalenessService.name);

    constructor(private readonly streams: StreamsFacadeService) {}

    async execute(context: SyncContext): Promise<void> {
        const now = Date.now();

        // A RESERVED stream hasn't been published yet, so it is legitimately absent from
        // ingest — never mark it stale. It is freed by its own TTL below, not by staleness.
        const staleStreams = context.allStreams.filter(
            (stream) =>
                !stream.isManual &&
                stream.status !== StreamStatus.RESERVED &&
                !context.ingestNames.has(stream.name),
        );
        for (const stream of staleStreams) {
            await this.removeStale(stream, context.clusterNames);
        }

        for (const stream of context.allStreams) {
            if (this.isExpiredReservation(stream, now)) {
                await this.expireReservation(stream);
            }
        }
    }

    private isExpiredReservation(stream: Stream, now: number): boolean {
        return (
            stream.status === StreamStatus.RESERVED &&
            !!stream.reservedUntil &&
            stream.reservedUntil.getTime() < now
        );
    }

    private async expireReservation(stream: Stream): Promise<void> {
        try {
            // Never claimed — no cluster pipeline was ever deployed, so just free the slot.
            await this.streams.remove(stream.name);
        } catch (error) {
            this.logger.warn(`Failed to expire reservation ${stream.name}`, error);
        }
    }

    private async removeStale(stream: Stream, clusterNames: Set<string>): Promise<void> {
        try {
            await this.streams.markStale(stream.name);

            if (clusterNames.has(stream.name)) {
                await this.streams.teardownClusterPipeline(stream);
            }
        } catch (error) {
            this.logger.warn(`Failed to remove stale stream ${stream.name}`, error);
        }
    }
}
