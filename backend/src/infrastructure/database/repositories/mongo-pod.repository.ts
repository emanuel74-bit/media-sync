import { Injectable } from "@nestjs/common";
import { FilterQuery, Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";

import { Pod } from "../../../pods/domain";
import { PodRole, PodStatus } from "../../../common/domain";
import { PodRepository } from "../../../pods/repositories";
import { MongoDomainRepository } from "./mongo-domain.repository";
import { Pod as PodSchema, PodDocument } from "../schemas/pod.schema";

type LeanPod = PodSchema & { createdAt: Date; updatedAt: Date };

@Injectable()
export class MongoPodRepository
    extends MongoDomainRepository<PodDocument, LeanPod, Pod>
    implements PodRepository
{
    constructor(@InjectModel(PodSchema.name) model: Model<PodDocument>) {
        super(model);
    }

    async upsertByPodId(
        podId: string,
        fields: Partial<Omit<Pod, "podId" | "createdAt" | "updatedAt">>,
    ): Promise<Pod> {
        const doc = await this.model.findOneAndUpdate(
            { podId },
            { $set: fields, $setOnInsert: { podId } },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        return this.fromDocument(doc!);
    }

    async findAll(): Promise<Pod[]> {
        const docs = await this.model.find().sort({ podId: 1 }).lean<LeanPod[]>().exec();
        return this.toDomainList(docs);
    }

    async findActive(since: Date, role?: PodRole): Promise<Pod[]> {
        const docs = await this.model
            .find(this.buildFilter(since, role))
            .sort({ podId: 1 })
            .lean<LeanPod[]>()
            .exec();
        return this.toDomainList(docs);
    }

    async findActivePodIds(since: Date): Promise<string[]> {
        const docs = await this.model
            .find(this.buildFilter(since))
            .select("podId")
            .lean<Array<{ podId: string }>>()
            .exec();
        return docs.map((pod) => pod.podId);
    }

    private buildFilter(since: Date, role?: PodRole): FilterQuery<PodDocument> {
        const filter: FilterQuery<PodDocument> = {
            status: PodStatus.ACTIVE,
            podId: { $ne: null },
            lastHeartbeatAt: { $gte: since },
        };
        if (role) {
            filter.type = role;
        }
        return filter;
    }

    protected toDomain(raw: LeanPod): Pod {
        return {
            podId: raw.podId,
            host: raw.host,
            tags: raw.tags,
            type: raw.type,
            status: raw.status,
            lastHeartbeatAt: raw.lastHeartbeatAt,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        };
    }
}
