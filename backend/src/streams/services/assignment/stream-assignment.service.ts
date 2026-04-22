import { EventEmitter2 } from "@nestjs/event-emitter";
import { Injectable, NotFoundException } from "@nestjs/common";

import { Stream } from "@/streams";
import { SystemEventNames } from "@/common";
import { StreamRepository } from "@/streams";

import { StreamQueryService } from "../query";
import { hashStreamToPod } from "./hash-stream-to-pod.util";

@Injectable()
export class StreamAssignmentService {
    constructor(
        private readonly streamRepository: StreamRepository,
        private readonly streamQuery: StreamQueryService,
        private readonly events: EventEmitter2,
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

        return this.assignToPod(name, hashStreamToPod(name, candidatePods));
    }

    async reassign(name: string, candidatePods: string[]): Promise<Stream> {
        const stream = await this.streamQuery.findRequiredByName(name);
        const available = candidatePods.filter((id) => id !== stream.assignedPod);
        if (!available.length) {
            return stream;
        }
        return this.assignToPod(name, hashStreamToPod(name, available));
    }
}
