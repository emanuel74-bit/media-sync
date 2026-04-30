import { EventEmitter2 } from "@nestjs/event-emitter";
import { Injectable, NotFoundException } from "@nestjs/common";

import { SystemEventNames } from "@/system-events";

import { Stream } from "../../domain/types/stream.types";
import { StreamRepository } from "../../repositories/stream.repository";

import { StreamQueryService } from "../query/stream-query.service";
import { StreamAssignmentPolicy } from "./stream-assignment.policy";

@Injectable()
export class StreamAssignmentService {
    constructor(
        private readonly streamRepository: StreamRepository,
        private readonly streamQuery: StreamQueryService,
        private readonly events: EventEmitter2,
        private readonly assignmentPolicy: StreamAssignmentPolicy,
    ) {}

    async assignToPod(name: string, podId: string): Promise<Stream> {
        const stream = await this.streamRepository.assignToPod(name, podId, new Date());
        if (!stream) {
            throw new NotFoundException(`Stream ${name} not found`);
        }
        this.events.emit(SystemEventNames.STREAM_ASSIGNED, {
            streamName: name,
            podId,
            assignedAt: stream.assignedAt,
        });
        return stream;
    }

    async clearAssignment(name: string): Promise<Stream> {
        const stream = await this.streamRepository.clearAssignment(name);
        if (!stream) {
            throw new NotFoundException(`Stream ${name} not found`);
        }
        this.events.emit(SystemEventNames.STREAM_UNASSIGNED, name);
        return stream;
    }

    async ensureAssigned(name: string, candidatePods: string[]): Promise<Stream> {
        const stream = await this.streamQuery.findRequiredByName(name);
        if (stream.assignedPod && candidatePods.includes(stream.assignedPod)) {
            return stream;
        }

        return this.assignToPod(name, this.assignmentPolicy.selectPod(name, candidatePods));
    }

    async reassign(name: string, candidatePods: string[]): Promise<Stream> {
        const stream = await this.streamQuery.findRequiredByName(name);
        const available = candidatePods.filter((id) => id !== stream.assignedPod);
        if (!available.length) {
            return stream;
        }
        return this.assignToPod(name, this.assignmentPolicy.selectPod(name, available));
    }
}
