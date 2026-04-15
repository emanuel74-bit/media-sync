import { ApiTags } from "@nestjs/swagger";
import { Controller, Get, Param, Query } from "@nestjs/common";

import { StreamInspectionService } from "../services/inspection";

@ApiTags("stream-inspection")
@Controller("api/stream-inspection")
export class StreamInspectionController {
    constructor(private readonly streamInspection: StreamInspectionService) {}

    @Get()
    getAllLatestInspections() {
        return this.streamInspection.findAllLatest();
    }

    @Get(":streamName")
    getLatestInspection(@Param("streamName") streamName: string) {
        return this.streamInspection.findLatest(streamName);
    }

    @Get(":streamName/history")
    getInspectionHistory(@Param("streamName") streamName: string, @Query("limit") limit = "10") {
        return this.streamInspection.findHistory(streamName, Number(limit));
    }
}
