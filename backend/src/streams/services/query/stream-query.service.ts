import { Injectable, NotFoundException } from "@nestjs/common";

import { StreamRepository } from "../../repositories";
import { Stream, StreamAssignmentInfo } from "../../domain";

@Injectable()
export class StreamQueryService {
    constructor(private readonly streamRepository: StreamRepository) {}

    async findAll(): Promise<Stream[]> {
        return this.streamRepository.findAll();
    }

    async findByName(name: string): Promise<Stream | null> {
        return this.streamRepository.findByName(name);
    }

    async findRequiredByName(name: string): Promise<Stream> {
        const stream = await this.findByName(name);
        if (!stream) {
            throw new NotFoundException(`Stream ${name} not found`);
        }
        return stream;
    }

    async findAssignedByName(name: string): Promise<Stream | null> {
        const stream = await this.findByName(name);
        if (!stream?.assignedPod) {
            return null;
        }
        return stream;
    }

    async findUnassigned(): Promise<Stream[]> {
        return this.streamRepository.findUnassigned();
    }

    async findByAssignedPod(podId: string): Promise<Stream[]> {
        return this.streamRepository.findByAssignedPod(podId);
    }

    async getAssignmentInfo(): Promise<StreamAssignmentInfo[]> {
        return this.streamRepository.getAssignmentInfo();
    }
}
