import { Injectable } from "@nestjs/common";

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
