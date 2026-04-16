import { Injectable, NotFoundException } from "@nestjs/common";

import { Stream } from "../../domain";
import { StreamStatus } from "../../../common/domain";
import { StreamRepository } from "../../repositories";
import { CreateStreamDto, UpdateStreamDto } from "../../dto";

@Injectable()
export class StreamCrudService {
    constructor(private readonly streamRepository: StreamRepository) {}

    async create(dto: CreateStreamDto): Promise<Stream> {
        return this.streamRepository.create({
            name: dto.name,
            source: dto.source,
            enabled: dto.enabled ?? true,
            isManual: true,
            status: StreamStatus.CREATED,
            lastError: null,
            metadata: {},
            activeConsumers: 0,
        });
    }

    async update(name: string, dto: UpdateStreamDto): Promise<Stream> {
        const updated = await this.streamRepository.update(name, dto);
        if (!updated) {
            throw new NotFoundException(`Stream ${name} not found`);
        }
        return updated;
    }

    async remove(name: string): Promise<void> {
        const deleted = await this.streamRepository.delete(name);
        if (!deleted) {
            throw new NotFoundException(`Stream ${name} not found`);
        }
    }

    async patch(name: string, data: Partial<Stream>): Promise<Stream | null> {
        return this.streamRepository.update(name, data);
    }
}
