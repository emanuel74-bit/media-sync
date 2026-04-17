import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { StreamTrack } from "../../../common/domain";
import { MongoDomainRepository } from "./mongo-domain.repository";
import { StreamInspectionRepository } from "../../../stream-inspection/repositories";
import { StreamInspectionRecord, NewStreamInspectionData } from "../../../stream-inspection/domain";
import {
    StreamInspection as StreamInspectionSchema,
    StreamInspectionDocument,
} from "../schemas/stream-inspection.schema";

type LeanInspection = StreamInspectionSchema & {
    createdAt: Date;
    updatedAt: Date;
};

@Injectable()
export class MongoStreamInspectionRepository
    extends MongoDomainRepository<StreamInspectionDocument, LeanInspection, StreamInspectionRecord>
    implements StreamInspectionRepository
{
    constructor(
        @InjectModel(StreamInspectionSchema.name)
        model: Model<StreamInspectionDocument>,
    ) {
        super(model);
    }

    async save(data: NewStreamInspectionData): Promise<void> {
        await new this.model(data).save();
    }

    async findLatest(streamName: string): Promise<StreamInspectionRecord | null> {
        const doc = await this.model
            .findOne({ streamName })
            .sort({ inspectedAt: -1 })
            .lean<LeanInspection>()
            .exec();
        return this.toOptionalDomain(doc);
    }

    async findHistory(streamName: string, limit: number): Promise<StreamInspectionRecord[]> {
        const docs = await this.model
            .find({ streamName })
            .sort({ inspectedAt: -1 })
            .limit(limit)
            .lean<LeanInspection[]>()
            .exec();
        return this.toDomainList(docs);
    }

    async findAllLatest(): Promise<StreamInspectionRecord[]> {
        const results = await this.model.aggregate<StreamInspectionSchema>([
            { $sort: { streamName: 1, inspectedAt: -1 } },
            { $group: { _id: "$streamName", latest: { $first: "$$ROOT" } } },
            { $replaceRoot: { newRoot: "$latest" } },
        ]);
        return this.toDomainList(results as LeanInspection[]);
    }

    protected toDomain(raw: LeanInspection): StreamInspectionRecord {
        return {
            streamName: raw.streamName,
            source: raw.source,
            tracks: raw.tracks as StreamTrack[],
            metadata: raw.metadata,
            lastError: raw.lastError,
            inspectedAt: raw.inspectedAt,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        };
    }
}
