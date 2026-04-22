import { Inject, Injectable, forwardRef } from "@nestjs/common";

import { StreamInspectionRecord } from "@/stream-inspection";
import { StreamInspectionRepository } from "@/stream-inspection";

@Injectable()
export class StreamInspectionQueryService {
    constructor(
        @Inject(forwardRef(() => StreamInspectionRepository))
        private readonly streamInspectionRepository: StreamInspectionRepository,
    ) {}

    async findLatest(streamName: string): Promise<StreamInspectionRecord | null> {
        return this.streamInspectionRepository.findLatest(streamName);
    }

    async findHistory(streamName: string, limit: number): Promise<StreamInspectionRecord[]> {
        return this.streamInspectionRepository.findHistory(streamName, limit);
    }

    async findAllLatest(): Promise<StreamInspectionRecord[]> {
        return this.streamInspectionRepository.findAllLatest();
    }
}
