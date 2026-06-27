import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { AlertSource } from "@/common";
import { AlertRepository } from "@/alerts";
import { Alert, AlertCreationData, AlertUpdateData } from "@/alerts";

import { Alert as AlertSchema, AlertDocument } from "../schemas";
import { MongoDomainRepository } from "./mongo-domain.repository";

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

    async create(data: AlertCreationData): Promise<Alert> {
        const doc = await new this.model({ ...data, lastSeenAt: new Date() }).save();
        return this.fromDocument(doc);
    }

    async update(id: string, data: AlertUpdateData): Promise<Alert | null> {
        const doc = await this.model.findByIdAndUpdate(id, data, { new: true }).exec();
        return doc ? this.fromDocument(doc) : null;
    }

    async resolveById(id: string, resolvedAt: Date): Promise<Alert | null> {
        const doc = await this.model
            .findByIdAndUpdate(id, { isResolved: true, resolvedAt }, { new: true })
            .exec();
        return doc ? this.fromDocument(doc) : null;
    }

    async findOpenBySourceAndSubject(source: AlertSource, subject: string): Promise<Alert[]> {
        const docs = await this.model
            .find({ source, subject, isResolved: false })
            .lean<LeanAlert[]>()
            .exec();
        return this.toDomainList(docs);
    }

    async findOpenSubjects(source: AlertSource): Promise<string[]> {
        const subjects = await this.model.distinct("subject", { source, isResolved: false });
        return subjects as string[];
    }

    async findAll(): Promise<Alert[]> {
        const docs = await this.model.find().sort({ createdAt: -1 }).lean<LeanAlert[]>().exec();
        return this.toDomainList(docs);
    }

    protected toDomain(raw: LeanAlert): Alert {
        return {
            id: raw._id.toString(),
            source: raw.source,
            subject: raw.subject,
            type: raw.type,
            severity: raw.severity,
            message: raw.message,
            isResolved: raw.isResolved,
            lastSeenAt: raw.lastSeenAt,
            resolvedAt: raw.resolvedAt,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        };
    }
}
