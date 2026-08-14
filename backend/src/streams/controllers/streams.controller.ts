import { ApiTags } from "@nestjs/swagger";
import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";

import { PublicStream, StreamAssignmentInfo } from "../domain";
import { AssignStreamDto, CreateStreamDto, UpdateStreamDto } from "../dto";
import { mapStreamToPublicStream } from "./map-stream-to-public-stream.mapper";
import {
    StreamAssignmentService,
    StreamCrudService,
    StreamSetupService,
    StreamQueryService,
} from "../services";

@ApiTags("streams")
@Controller("api/streams")
export class StreamsController {
    constructor(
        private readonly streamQuery: StreamQueryService,
        private readonly streamCrud: StreamCrudService,
        private readonly streamSetup: StreamSetupService,
        private readonly streamAssignment: StreamAssignmentService,
    ) {}

    @Get()
    async findAll(): Promise<PublicStream[]> {
        const streams = await this.streamQuery.findAll();
        return streams.map(mapStreamToPublicStream);
    }

    @Post()
    async create(@Body() dto: CreateStreamDto): Promise<PublicStream> {
        const stream = await this.streamSetup.onboard({
            name: dto.name,
            source: dto.source,
            isEnabled: dto.isEnabled,
        });
        return mapStreamToPublicStream(stream);
    }

    @Get("assignment")
    assignment(): Promise<StreamAssignmentInfo[]> {
        return this.streamQuery.getAssignmentInfo();
    }

    @Get(":name")
    async findOne(@Param("name") name: string): Promise<PublicStream | null> {
        const stream = await this.streamQuery.findByName(name);
        return stream ? mapStreamToPublicStream(stream) : null;
    }

    @Patch(":name")
    async update(@Param("name") name: string, @Body() dto: UpdateStreamDto): Promise<PublicStream> {
        const stream = await this.streamCrud.update(name, {
            source: dto.source,
            isEnabled: dto.isEnabled,
            status: dto.status,
        });
        return mapStreamToPublicStream(stream);
    }

    @Delete(":name")
    remove(@Param("name") name: string): Promise<void> {
        return this.streamCrud.remove(name);
    }

    @Patch(":name/assign")
    async assign(
        @Param("name") name: string,
        @Body() assignStreamDto: AssignStreamDto,
    ): Promise<PublicStream> {
        const stream = await this.streamAssignment.assignToNode(name, assignStreamDto.nodeId);
        return mapStreamToPublicStream(stream);
    }

    @Patch(":name/unassign")
    async unassign(@Param("name") name: string): Promise<PublicStream> {
        const stream = await this.streamAssignment.clearAssignment(name);
        return mapStreamToPublicStream(stream);
    }
}
