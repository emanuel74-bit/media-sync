import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { AlertSource } from "@/common";
import { AlertRepository } from "@/alerts";
import { Alert, AlertCreateResult, AlertCreationData, AlertUpdateData } from "@/alerts";

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

    async create(data: AlertCreationData): Promise<AlertCreateResult> {
        // Atomic open-or-find on the (source, subject, type) dedup key. Paired with
        // the partial unique index, the server collapses a concurrent insert into
        // the existing open alert instead of creating a duplicate. `$setOnInsert`
        // means a losing racer leaves the winner's alert untouched.
        const result = await this.model
            .findOneAndUpdate(
                { source: data.source, subject: data.subject, type: data.type, isResolved: false },
                {
                    $setOnInsert: {
                        severity: data.severity,
                        message: data.message,
                        lastSeenAt: new Date(),
                    },
                },
                { upsert: true, new: true, includeResultMetadata: true },
            )
            .exec();

        const created = !result.lastErrorObject?.updatedExisting;
        return { alert: this.fromDocument(result.value as AlertDocument), created };
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
