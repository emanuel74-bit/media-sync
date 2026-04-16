import { Injectable } from "@nestjs/common";

import { Metric } from "../../domain";
import { PodRole } from "../../../common/domain";
import { MetricRepository } from "../../repositories";
import { StreamStats } from "../../../infrastructure/media-mtx/types";

@Injectable()
export class MetricPersistenceService {
    constructor(private readonly metricRepository: MetricRepository) {}

    async findRecent(streamName: string, limit = 50): Promise<Metric[]> {
        return this.metricRepository.findRecent(streamName, limit);
    }

    async saveFromStats(streamName: string, context: PodRole, stats: StreamStats): Promise<Metric> {
        return this.metricRepository.save({
            streamName,
            context,
            bitrate: Number(stats.bitrate ?? 0),
            fps: Number(stats.fps ?? 0),
            latency: Number(stats.latency ?? 0),
            jitter: Number(stats.jitter ?? 0),
            packetLoss: Number(stats.packetLoss ?? 0),
            consumers: Number(stats.consumers ?? 0),
        });
    }
}
