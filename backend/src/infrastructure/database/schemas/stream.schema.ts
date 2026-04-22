import { Document, Schema as MongooseSchema } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

import { StreamStatus } from "@/common";
import { StreamMetadata } from "@/streams";

export type StreamDocument = Stream & Document;

export { StreamMetadata };

@Schema({ timestamps: true })
export class Stream {
    @Prop({ required: true, unique: true })
    name!: string;

    @Prop({ required: true })
    source!: string;

    @Prop({
        default: StreamStatus.DISCOVERED,
        enum: Object.values(StreamStatus),
    })
    status!: StreamStatus;

    @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
    metadata!: StreamMetadata;

    @Prop({ default: false })
    isEnabled!: boolean;

    @Prop({ type: Date, default: null })
    lastSeenAt?: Date;

    @Prop({ type: Date, default: null })
    lastSyncedAt?: Date;

    @Prop({ default: null })
    lastError?: string;

    @Prop({ default: 0 })
    activeConsumers!: number;

    @Prop({ default: false })
    isManual!: boolean;

    @Prop({ type: String, required: false, default: null })
    assignedPod?: string | null;

    @Prop({ type: Date, required: false, default: null })
    assignedAt?: Date | null;
}

export const StreamSchema = SchemaFactory.createForClass(Stream);
