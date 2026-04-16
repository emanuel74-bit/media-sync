import { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

import { PodRole } from "../../../common/domain";

export type MetricDocument = Metric & Document;

@Schema({ timestamps: true })
export class Metric {
    @Prop({ required: true })
    streamName!: string;

    @Prop({ required: true, enum: Object.values(PodRole) })
    context!: PodRole;

    @Prop({ required: true })
    bitrate!: number;

    @Prop({ required: true })
    fps!: number;

    @Prop({ required: true })
    latency!: number;

    @Prop({ required: true })
    jitter!: number;

    @Prop({ required: true })
    packetLoss!: number;

    @Prop({ required: true })
    consumers!: number;
}

export const MetricSchema = SchemaFactory.createForClass(Metric);
