import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { StreamStatus } from "@/common";
import { StreamRepository } from "@/streams";
import { Stream, StreamAssignmentInfo } from "@/streams";

import { MongoDomainRepository } from "./mongo-domain.repository";
import { Stream as StreamSchema, StreamDocument } from "../schemas";

type LeanStream = StreamSchema & { createdAt?: Date; updatedAt?: Date };
type LeanAssignment = {
    name: string;
    assignedPod?: string | null;
    assignedAt?: Date | null;
    status: StreamStatus;
};

@Injectable()
export class MongoStreamRepository
    extends MongoDomainRepository<StreamDocument, LeanStream, Stream>
    implements StreamRepository
{
    constructor(
        @InjectModel(StreamSchema.name)
        model: Model<StreamDocument>,
    ) {
        super(model);
    }

    async create(data: Partial<Stream> & Pick<Stream, "name" | "source">): Promise<Stream> {
        const doc = await new this.model(this.toPersistence(data)).save();
        return this.fromDocument(doc);
    }

    async findByName(name: string): Promise<Stream | null> {
        const doc = await this.model.findOne({ name }).lean<LeanStream>().exec();
        return this.toOptionalDomain(doc);
    }

    async findAll(): Promise<Stream[]> {
        const docs = await this.model.find().lean<LeanStream[]>().exec();
        return this.toDomainList(docs);
    }

    async findUnassigned(): Promise<Stream[]> {
        const docs = await this.model.find({ assignedPod: null }).lean<LeanStream[]>().exec();
        return this.toDomainList(docs);
    }

    async findByAssignedPod(podId: string): Promise<Stream[]> {
        const docs = await this.model.find({ assignedPod: podId }).lean<LeanStream[]>().exec();
        return this.toDomainList(docs);
    }

    async upsert(name: string, data: Partial<Stream>): Promise<Stream> {
        const doc = await this.model.findOneAndUpdate(
            { name },
            { $set: { ...this.toPersistence(data), isManual: false } },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        return this.fromDocument(doc!);
    }

    async assignToPod(name: string, podId: string, assignedAt: Date): Promise<Stream | null> {
        const doc = await this.model.findOneAndUpdate(
            { name },
            {
                $set: {
                    assignedPod: podId,
                    assignedAt,
                    status: StreamStatus.ASSIGNED,
                },
            },
            { new: true },
        );
        return doc ? this.fromDocument(doc) : null;
    }

    async clearAssignment(name: string): Promise<Stream | null> {
        const doc = await this.model.findOneAndUpdate(
            { name },
            { $set: { assignedPod: null, assignedAt: null } },
            { new: true },
        );
        return doc ? this.fromDocument(doc) : null;
    }

    async update(name: string, data: Partial<Stream>): Promise<Stream | null> {
        const doc = await this.model.findOneAndUpdate(
            { name },
            { $set: this.toPersistence(data) },
            { new: true },
        );
        return doc ? this.fromDocument(doc) : null;
    }

    async delete(name: string): Promise<boolean> {
        const result = await this.model.findOneAndDelete({ name });
        return result !== null;
    }

    async getAssignmentInfo(): Promise<StreamAssignmentInfo[]> {
        const docs = await this.model
            .find()
            .select("name assignedPod assignedAt status")
            .lean<LeanAssignment[]>()
            .exec();
        return docs.map((d) => ({
            name: d.name,
            assignedPod: d.assignedPod,
            assignedAt: d.assignedAt,
            status: d.status,
        }));
    }

    private toPersistence(data: Partial<Stream>): Record<string, unknown> {
        return { ...data };
    }

    protected toDomain(raw: LeanStream): Stream {
        return {
            name: raw.name,
            source: raw.source,
            status: raw.status,
            metadata: raw.metadata,
            isEnabled: raw.isEnabled,
            lastSeenAt: raw.lastSeenAt,
            lastSyncedAt: raw.lastSyncedAt,
            lastError: raw.lastError,
            activeConsumers: raw.activeConsumers,
            isManual: raw.isManual,
            assignedPod: raw.assignedPod,
            assignedAt: raw.assignedAt,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        };
    }
}
