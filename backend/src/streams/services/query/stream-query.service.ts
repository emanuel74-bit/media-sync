import { Injectable } from "@nestjs/common";

import { StreamRepository } from "../../repositories";
import { Stream, StreamAssignmentInfo } from "../../domain";

@Injectable()
export class StreamQueryService {
    constructor(private readonly streamRepository: StreamRepository) {}

    async findAll(): Promise<Stream[]> {
        return this.streamRepository.findAll();
    }

    async findByName(name: string): Promise<Stream | null> {
        return this.streamRepository.findByName(name);
    }

    async findUnassigned(): Promise<Stream[]> {
        return this.streamRepository.findUnassigned();
    }

    async findByAssignedNode(nodeId: string): Promise<Stream[]> {
        return this.streamRepository.findByAssignedNode(nodeId);
    }

    /** Pending reservations grouped by the ingest node holding each slot. */
    async countReservationsByIngestNode(): Promise<Record<string, number>> {
        return this.streamRepository.countReservationsByIngestNode();
    }

    async getAssignmentInfo(): Promise<StreamAssignmentInfo[]> {
        return this.streamRepository.findAssignmentInfo();
    }
}
