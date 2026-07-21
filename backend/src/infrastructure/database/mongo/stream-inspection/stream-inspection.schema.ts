import { Document, Schema as MongooseSchema } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

import { NodeRole, StreamTrack } from "@/common";
export type StreamInspectionDocument = StreamInspection & Document;

@Schema({ timestamps: true })
export class StreamInspection {
    @Prop({ required: true })
    streamName!: string;

    @Prop({ required: true, enum: Object.values(NodeRole) })
    source!: NodeRole;

    @Prop({ type: [MongooseSchema.Types.Mixed] })
    tracks!: StreamTrack[];

    @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
    metadata!: Record<string, unknown>;

    @Prop({ type: String, default: null })
    lastError?: string;

    @Prop({ type: Date, default: Date.now })
    inspectedAt!: Date;
}

export const StreamInspectionSchema = SchemaFactory.createForClass(StreamInspection);
