import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { PathMetric, NewPathMetricData, PathMetricRepository } from "@/metrics";

import { MongoDomainRepository } from "./mongo-domain.repository";
import { PathMetric as PathMetricSchema, PathMetricDocument } from "../schemas";

type LeanPathMetric = PathMetricSchema & { createdAt: Date };

@Injectable()
export class MongoPathMetricRepository
    extends MongoDomainRepository<PathMetricDocument, LeanPathMetric, PathMetric>
    implements PathMetricRepository
{
    constructor(
        @InjectModel(PathMetricSchema.name)
        model: Model<PathMetricDocument>,
    ) {
        super(model);
    }

    async saveMany(data: NewPathMetricData[]): Promise<void> {
        if (data.length === 0) {
            return;
        }
        await this.model.insertMany(data);
    }

    async findRecent(streamName: string, limit: number): Promise<PathMetric[]> {
        const docs = await this.model
            .find({ streamName })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean<LeanPathMetric[]>()
            .exec();
        return this.toDomainList(docs);
    }

    protected toDomain(raw: LeanPathMetric): PathMetric {
        return {
            streamName: raw.streamName,
            context: raw.context,
            node: raw.node,
            state: raw.state,
            ready: raw.ready,
            bytesReceived: raw.bytesReceived,
            bytesSent: raw.bytesSent,
            readers: raw.readers,
            framesInError: raw.framesInError,
            createdAt: raw.createdAt,
        };
    }
}
