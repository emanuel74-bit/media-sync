import { ApiTags } from "@nestjs/swagger";
import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";

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
    findAll() {
        return this.streamQuery.findAll();
    }

    @Post()
    create(@Body() createStreamDto: CreateStreamDto) {
        return this.streamLifecycle.create(createStreamDto);
    }

    @Get("assignment")
    assignment() {
        return this.streamQuery.getAssignmentInfo();
    }

    @Get(":name")
    findOne(@Param("name") name: string) {
        return this.streamQuery.findByName(name);
    }

    @Patch(":name")
    update(@Param("name") name: string, @Body() updateStreamDto: UpdateStreamDto) {
        return this.streamCrud.update(name, updateStreamDto);
    }

    @Delete(":name")
    remove(@Param("name") name: string) {
        return this.streamCrud.remove(name);
    }

    @Patch(":name/assign")
    assign(@Param("name") name: string, @Body() assignStreamDto: AssignStreamDto) {
        return this.streamAssignment.assignToPod(name, assignStreamDto.podId);
    }

    @Patch(":name/unassign")
    unassign(@Param("name") name: string) {
        return this.streamAssignment.clearAssignment(name);
    }
}
