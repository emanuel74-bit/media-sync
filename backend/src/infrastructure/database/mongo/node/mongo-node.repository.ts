import { Injectable } from "@nestjs/common";
import { FilterQuery, Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";

import { Node } from "@/nodes";
import { NodeRepository } from "@/nodes";
import { NodeRole, NodeStatus } from "@/common";

import { Node as NodeSchema, NodeDocument } from "./node.schema";
import { MongoDomainRepository } from "../mongo-domain.repository";

type LeanNode = NodeSchema & { createdAt: Date; updatedAt: Date };

@Injectable()
export class MongoNodeRepository
    extends MongoDomainRepository<NodeDocument, LeanNode, Node>
    implements NodeRepository
{
    constructor(@InjectModel(NodeSchema.name) model: Model<NodeDocument>) {
        super(model);
    }

    async upsertByNodeId(
        nodeId: string,
        fields: Partial<Omit<Node, "nodeId" | "createdAt" | "updatedAt">>,
    ): Promise<Node> {
        const doc = await this.model.findOneAndUpdate(
            { nodeId },
            { $set: fields, $setOnInsert: { nodeId } },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        return this.fromDocument(doc!);
    }

    async findAll(): Promise<Node[]> {
        const docs = await this.model.find().sort({ nodeId: 1 }).lean<LeanNode[]>().exec();
        return this.toDomainList(docs);
    }

    async findActive(since: Date, role?: NodeRole): Promise<Node[]> {
        const docs = await this.model
            .find(this.buildFilter(since, role))
            .sort({ nodeId: 1 })
            .lean<LeanNode[]>()
            .exec();
        return this.toDomainList(docs);
    }

    private buildFilter(since: Date, role?: NodeRole): FilterQuery<NodeDocument> {
        const filter: FilterQuery<NodeDocument> = {
            status: NodeStatus.ACTIVE,
            nodeId: { $ne: null },
            lastHeartbeatAt: { $gte: since },
        };
        if (role) {
            filter.type = role;
        }
        return filter;
    }

    protected toDomain(raw: LeanNode): Node {
        return {
            nodeId: raw.nodeId,
            host: raw.host,
            apiPort: raw.apiPort,
            rtspPort: raw.rtspPort,
            metricsPort: raw.metricsPort,
            type: raw.type,
            status: raw.status,
            lastHeartbeatAt: raw.lastHeartbeatAt,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        };
    }
}
