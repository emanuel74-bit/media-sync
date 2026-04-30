import { ApiTags } from "@nestjs/swagger";
import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Query } from "@nestjs/common";

import { StreamInspectionRecord } from "../domain/types/stream-inspection.types";
import { StreamInspectionQueryService } from "../services/query/stream-inspection-query.service";

@ApiTags("stream-inspection")
@Controller("api/stream-inspection")
export class StreamInspectionController {
    constructor(private readonly streamInspection: StreamInspectionQueryService) {}

    @Get()
    getAllLatestInspections(): Promise<StreamInspectionRecord[]> {
        return this.streamInspection.findAllLatest();
    }

    @Get(":streamName")
    getLatestInspection(
        @Param("streamName") streamName: string,
    ): Promise<StreamInspectionRecord | null> {
        return this.streamInspection.findLatest(streamName);
    }

    @Get(":streamName/history")
    getInspectionHistory(
        @Param("streamName") streamName: string,
        @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
    ): Promise<StreamInspectionRecord[]> {
        return this.streamInspection.findHistory(streamName, limit);
    }
}
