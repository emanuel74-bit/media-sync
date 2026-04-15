import { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

import { PodRole } from "../../../common";
import { StreamTrack } from "../../../stream-inspection/domain";

export type StreamInspectionDocument = StreamInspection & Document;

export { StreamTrack };

@Schema({ timestamps: true })
export class StreamInspection {
    @Prop({ required: true })
    streamName!: string;

    @Prop({ required: true, enum: Object.values(PodRole) })
    source!: PodRole;

    @Prop({ type: [Object] })
    tracks!: StreamTrack[];

    @Prop({ type: Object, default: {} })
    metadata!: Record<string, unknown>;

    @Prop({ type: String, default: null })
    lastError?: string;

    @Prop({ type: Date, default: Date.now })
    inspectedAt!: Date;
}

export const StreamInspectionSchema = SchemaFactory.createForClass(StreamInspection);
