import { ApiTags } from "@nestjs/swagger";
import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";

import { Stream, StreamAssignmentInfo } from "../domain";
import { StreamQueryService } from "../services/query";
import { StreamAssignmentService } from "../services/assignment";
import { AssignStreamDto, CreateStreamDto, UpdateStreamDto } from "../dto";
import { StreamCrudService, StreamLifecycleService } from "../services/lifecycle";

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
    create(@Body() createStreamDto: CreateStreamDto): Promise<Stream> {
        return this.streamLifecycle.create(createStreamDto);
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
    update(@Param("name") name: string, @Body() updateStreamDto: UpdateStreamDto): Promise<Stream> {
        return this.streamCrud.update(name, updateStreamDto);
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
