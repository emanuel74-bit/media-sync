/**
 * @deprecated Use StreamInspectionSchedulerService, StreamInspectionRecorderService,
 * or StreamInspectionQueryService directly.
 */
import { Injectable } from "@nestjs/common";

import { StreamInspectionRecord } from "../../domain";
import { StreamInspectionQueryService } from "./stream-inspection-query.service";

@Injectable()
export class StreamInspectionService {
    constructor(private readonly query: StreamInspectionQueryService) {}

    async findLatest(streamName: string): Promise<StreamInspectionRecord | null> {
        return this.query.findLatest(streamName);
    }

    async findHistory(streamName: string, limit: number): Promise<StreamInspectionRecord[]> {
        return this.query.findHistory(streamName, limit);
    }

    async findAllLatest(): Promise<StreamInspectionRecord[]> {
        return this.query.findAllLatest();
    }
}
