import { Injectable, NotFoundException } from "@nestjs/common";

import { StreamStatus } from "@/common";

import { StreamRepository } from "../../repositories";
import { StreamStatusService } from "./stream-status.service";
import { CreateStreamData, Stream, UpdateStreamData } from "../../domain";

@Injectable()
export class StreamCrudService {
    constructor(
        private readonly streamRepository: StreamRepository,
        private readonly streamStatus: StreamStatusService,
    ) {}

    async create(data: CreateStreamData): Promise<Stream> {
        return this.streamRepository.create({
            name: data.name,
            source: data.source,
            isEnabled: data.isEnabled ?? true,
            isManual: true,
            status: StreamStatus.CREATED,
            lastError: null,
            metadata: {},
            activeConsumers: 0,
        });
    }

    /**
     * Create a stream in the `RESERVED` state, holding a publish slot on an ingest node until
     * media arrives or the TTL expires. The single birth seam for reservations — the reserve
     * orchestration composes it rather than touching the repository directly.
     */
    async createReservation(data: {
        name: string;
        source: string;
        ingestNode: string;
        reservedUntil: Date;
        publishToken: string;
    }): Promise<Stream> {
        return this.streamRepository.create({
            name: data.name,
            source: data.source,
            status: StreamStatus.RESERVED,
            ingestNode: data.ingestNode,
            reservedUntil: data.reservedUntil,
            publishToken: data.publishToken,
            isEnabled: true,
            isManual: false,
            lastError: null,
            metadata: {},
            activeConsumers: 0,
        });
    }

    async update(name: string, data: UpdateStreamData): Promise<Stream> {
        const { status, ...fields } = data;
        if (status) {
            return this.streamStatus.transitionTo(name, status, fields);
        }
        const updated = await this.streamRepository.update(name, fields);
        if (!updated) {
            throw new NotFoundException(`Stream ${name} not found`);
        }
        return updated;
    }

    async remove(name: string): Promise<void> {
        const deleted = await this.streamRepository.delete(name);
        if (!deleted) {
            throw new NotFoundException(`Stream ${name} not found`);
        }
    }

    async expireReservation(name: string, expiredBefore: Date): Promise<boolean> {
        return this.streamRepository.deleteExpiredReservation(name, expiredBefore);
    }
}
