import { Injectable } from "@nestjs/common";

import { StreamInspectionRecord } from "../../domain";
import { StreamInspectionRepository } from "../../repositories";

/** Upper bound on a single history page, guarding against unbounded client requests. */
const MAX_HISTORY_LIMIT = 100;

@Injectable()
export class StreamInspectionQueryService {
    constructor(private readonly streamInspectionRepository: StreamInspectionRepository) {}

    async findLatest(streamName: string): Promise<StreamInspectionRecord | null> {
        return this.streamInspectionRepository.findLatest(streamName);
    }

    async findHistory(streamName: string, limit: number): Promise<StreamInspectionRecord[]> {
        const safeLimit = Math.min(Math.max(1, limit), MAX_HISTORY_LIMIT);
        return this.streamInspectionRepository.findHistory(streamName, safeLimit);
    }

    async findAllLatest(): Promise<StreamInspectionRecord[]> {
        return this.streamInspectionRepository.findAllLatest();
    }
}
