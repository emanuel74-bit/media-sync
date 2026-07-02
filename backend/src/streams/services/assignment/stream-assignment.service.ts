import { EventEmitter2 } from "@nestjs/event-emitter";
import { Injectable, NotFoundException } from "@nestjs/common";

import { SystemEventNames } from "@/common";

import { Stream } from "../../domain";
import { StreamRepository } from "../../repositories";
import { StreamAssignmentPolicy } from "./stream-assignment.policy";

@Injectable()
export class StreamAssignmentService {
    constructor(
        private readonly streamRepository: StreamRepository,
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
        const stream = await this.streamRepository.findByName(name);
        if (!stream) {
            throw new NotFoundException(`Stream ${name} not found`);
        }
        if (stream.assignedPod && candidatePods.includes(stream.assignedPod)) {
            return stream;
        }

        return this.assignToPod(name, this.assignmentPolicy.selectPod(name, candidatePods));
    }
}
