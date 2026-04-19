import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { AlertType } from "../../../common/domain";
import { AlertRepository } from "../../../alerts/repositories";
import { MongoDomainRepository } from "./mongo-domain.repository";
import { Alert, AlertCreationData } from "../../../alerts/domain";
import { Alert as AlertSchema, AlertDocument } from "../schemas/alert.schema";

type LeanAlert = AlertSchema & {
    _id: { toString(): string };
    createdAt: Date;
    updatedAt: Date;
};

@Injectable()
export class MongoAlertRepository
    extends MongoDomainRepository<AlertDocument, LeanAlert, Alert>
    implements AlertRepository
{
    constructor(
        @InjectModel(AlertSchema.name)
        model: Model<AlertDocument>,
    ) {
        super(model);
    }

    async findUnresolvedByStreamAndType(
        streamName: string,
        type: AlertType,
    ): Promise<Alert | null> {
        const doc = await this.model
            .findOne({ streamName, type, isResolved: false })
            .lean<LeanAlert>()
            .exec();
        return this.toOptionalDomain(doc);
    }

    async create(data: AlertCreationData): Promise<Alert> {
        const doc = await new this.model(data).save();
        return this.fromDocument(doc);
    }

    async resolveById(id: string, resolvedAt: Date): Promise<Alert | null> {
        const doc = await this.model
            .findByIdAndUpdate(id, { isResolved: true, resolvedAt }, { new: true })
            .exec();
        return doc ? this.fromDocument(doc) : null;
    }

    async findAll(): Promise<Alert[]> {
        const docs = await this.model.find().sort({ createdAt: -1 }).lean<LeanAlert[]>().exec();
        return this.toDomainList(docs);
    }

    protected toDomain(raw: LeanAlert): Alert {
        return {
            id: raw._id.toString(),
            streamName: raw.streamName,
            type: raw.type,
            severity: raw.severity,
            message: raw.message,
            isResolved: raw.isResolved,
            resolvedAt: raw.resolvedAt,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        };
    }
}
