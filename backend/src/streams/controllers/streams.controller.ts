import { ApiTags } from "@nestjs/swagger";
import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";

import { StreamCrudService } from "@/streams";
import { StreamQueryService } from "@/streams";
import { StreamLifecycleService } from "@/streams";
import { StreamAssignmentService } from "@/streams";
import { Stream, StreamAssignmentInfo } from "@/streams";

import { AssignStreamDto, CreateStreamDto, UpdateStreamDto } from "../dto";

@ApiTags("streams")
@Controller("api/streams")
export class StreamsController {
    constructor(
        private readonly streamQuery: StreamQueryService,
        private readonly streamCrud: StreamCrudService,
        private readonly streamLifecycle: StreamLifecycleService,
        private readonly streamAssignment: StreamAssignmentService,
    ) {}

    @Get()
    findAll(): Promise<Stream[]> {
        return this.streamQuery.findAll();
    }

    @Post()
    create(@Body() dto: CreateStreamDto): Promise<Stream> {
        return this.streamLifecycle.create({
            name: dto.name,
            source: dto.source,
            isEnabled: dto.isEnabled,
        });
    }

    @Get("assignment")
    assignment(): Promise<StreamAssignmentInfo[]> {
        return this.streamQuery.getAssignmentInfo();
    }

    @Get(":name")
    findOne(@Param("name") name: string): Promise<Stream | null> {
        return this.streamQuery.findByName(name);
    }

    @Patch(":name")
    update(@Param("name") name: string, @Body() dto: UpdateStreamDto): Promise<Stream> {
        return this.streamCrud.update(name, {
            source: dto.source,
            isEnabled: dto.isEnabled,
            status: dto.status,
        });
    }

    @Delete(":name")
    remove(@Param("name") name: string): Promise<void> {
        return this.streamCrud.remove(name);
    }

    @Patch(":name/assign")
    assign(@Param("name") name: string, @Body() assignStreamDto: AssignStreamDto): Promise<Stream> {
        return this.streamAssignment.assignToPod(name, assignStreamDto.podId);
    }

    @Patch(":name/unassign")
    unassign(@Param("name") name: string): Promise<Stream> {
        return this.streamAssignment.clearAssignment(name);
    }
}
