import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { NodeMetric, NewNodeMetricData, NodeMetricRepository } from "@/metrics";

import { MongoDomainRepository } from "../mongo-domain.repository";
import { NodeMetric as NodeMetricSchema, NodeMetricDocument } from "./node-metric.schema";

type LeanNodeMetric = NodeMetricSchema & { createdAt: Date };

@Injectable()
export class MongoNodeMetricRepository
    extends MongoDomainRepository<NodeMetricDocument, LeanNodeMetric, NodeMetric>
    implements NodeMetricRepository
{
    constructor(
        @InjectModel(NodeMetricSchema.name)
        model: Model<NodeMetricDocument>,
    ) {
        super(model);
    }

    async saveMany(data: NewNodeMetricData[]): Promise<void> {
        if (data.length === 0) {
            return;
        }
        await this.model.insertMany(data);
    }

    async findRecent(limit: number): Promise<NodeMetric[]> {
        const docs = await this.model
            .find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean<LeanNodeMetric[]>()
            .exec();
        return this.toDomainList(docs);
    }

    protected toDomain(raw: LeanNodeMetric): NodeMetric {
        return {
            context: raw.context,
            node: raw.node,
            paths: raw.paths,
            rtspConns: raw.rtspConns,
            rtspSessions: raw.rtspSessions,
            rtmpConns: raw.rtmpConns,
            srtConns: raw.srtConns,
            webrtcSessions: raw.webrtcSessions,
            hlsMuxers: raw.hlsMuxers,
            createdAt: raw.createdAt,
        };
    }
}
