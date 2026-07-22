import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

import { StreamStatus } from "@/common";
import { StreamRepository } from "@/streams";
import { Stream, StreamAssignmentInfo } from "@/streams";

import { MongoDomainRepository } from "../mongo-domain.repository";
import { Stream as StreamSchema, StreamDocument } from "./stream.schema";

type LeanStream = StreamSchema & { createdAt?: Date; updatedAt?: Date };
type LeanAssignment = {
    name: string;
    assignedNode?: string | null;
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
        const doc = await new this.model(data).save();
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
        const docs = await this.model.find({ assignedNode: null }).lean<LeanStream[]>().exec();
        return this.toDomainList(docs);
    }

    async findByAssignedNode(nodeId: string): Promise<Stream[]> {
        const docs = await this.model.find({ assignedNode: nodeId }).lean<LeanStream[]>().exec();
        return this.toDomainList(docs);
    }

    async countReservationsByIngestNode(): Promise<Record<string, number>> {
        const rows = await this.model.aggregate<{ _id: string | null; count: number }>([
            { $match: { status: StreamStatus.RESERVED, ingestNode: { $ne: null } } },
            { $group: { _id: "$ingestNode", count: { $sum: 1 } } },
        ]);
        return rows.reduce<Record<string, number>>((acc, row) => {
            if (row._id) {
                acc[row._id] = row.count;
            }
            return acc;
        }, {});
    }

    async upsert(name: string, data: Partial<Stream>): Promise<Stream> {
        const doc = await this.model.findOneAndUpdate(
            { name },
            { $set: { ...data, isManual: false } },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        return this.fromDocument(doc!);
    }

    async transitionStatus(
        name: string,
        expectedStatus: string,
        data: Partial<Stream>,
    ): Promise<Stream | null> {
        const doc = await this.model.findOneAndUpdate(
            { name, status: expectedStatus },
            { $set: data },
            { new: true, runValidators: true },
        );
        return doc ? this.fromDocument(doc) : null;
    }

    async update(name: string, data: Partial<Stream>): Promise<Stream | null> {
        const doc = await this.model.findOneAndUpdate({ name }, { $set: data }, { new: true });
        return doc ? this.fromDocument(doc) : null;
    }

    async delete(name: string): Promise<boolean> {
        const result = await this.model.findOneAndDelete({ name });
        return result !== null;
    }

    async findAssignmentInfo(): Promise<StreamAssignmentInfo[]> {
        const docs = await this.model
            .find()
            .select("name assignedNode assignedAt status")
            .lean<LeanAssignment[]>()
            .exec();
        return docs.map((d) => ({
            name: d.name,
            assignedNode: d.assignedNode,
            assignedAt: d.assignedAt,
            status: d.status,
        }));
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
            ingestNode: raw.ingestNode,
            reservedUntil: raw.reservedUntil,
            publishToken: raw.publishToken,
            assignedNode: raw.assignedNode,
            assignedAt: raw.assignedAt,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        };
    }
}
