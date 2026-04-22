import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { MetricRepository } from "@/metrics";
import { Metric, NewMetricData } from "@/metrics";

import { MongoDomainRepository } from "./mongo-domain.repository";
import { Metric as MetricSchema, MetricDocument } from "../schemas";

type LeanMetric = MetricSchema & { createdAt: Date; updatedAt: Date };

@Injectable()
export class MongoMetricRepository
    extends MongoDomainRepository<MetricDocument, LeanMetric, Metric>
    implements MetricRepository
{
    constructor(
        @InjectModel(MetricSchema.name)
        model: Model<MetricDocument>,
    ) {
        super(model);
    }

    async findRecent(streamName: string, limit: number): Promise<Metric[]> {
        const docs = await this.model
            .find({ streamName })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean<LeanMetric[]>()
            .exec();
        return this.toDomainList(docs);
    }

    async save(data: NewMetricData): Promise<Metric> {
        const doc = await new this.model(data).save();
        return this.fromDocument(doc);
    }

    protected toDomain(raw: LeanMetric): Metric {
        return {
            streamName: raw.streamName,
            context: raw.context,
            bitrate: raw.bitrate,
            fps: raw.fps,
            latency: raw.latency,
            jitter: raw.jitter,
            packetLoss: raw.packetLoss,
            consumers: raw.consumers,
            createdAt: raw.createdAt,
        };
    }
}
