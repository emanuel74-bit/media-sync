import { EventEmitter2 } from "@nestjs/event-emitter";
import { Injectable, NotFoundException } from "@nestjs/common";

import { SystemEventNames, selectByHash } from "@/common";

import { Stream } from "../../domain";
import { StreamRepository } from "../../repositories";

/**
 * Assigns a stream to the cluster pod that serves it. The pod is chosen by the context-free
 * `selectByHash` (deterministic by name — a stream sticks to its node across ticks); this
 * service gathers the candidates and persists/announces the outcome. Ingest placement is not
 * here: it is a birth-time selection folded into the reservation insert (`StreamSetupService`),
 * not an assignment mutation.
 */
@Injectable()
export class StreamAssignmentService {
    constructor(
        private readonly streamRepository: StreamRepository,
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

    /** Pin a stream to a cluster pod (idempotent if already on a live candidate). */
    async ensureAssigned(name: string, candidatePods: string[]): Promise<Stream> {
        const stream = await this.streamRepository.findByName(name);
        if (!stream) {
            throw new NotFoundException(`Stream ${name} not found`);
        }
        if (stream.assignedPod && candidatePods.includes(stream.assignedPod)) {
            return stream;
        }

        const selectedPod = selectByHash(name, candidatePods);
        return this.assignToPod(name, selectedPod);
    }
}
