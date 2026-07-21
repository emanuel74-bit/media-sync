import { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

import { PodRole, PodStatus } from "@/common";

export type PodDocument = Pod & Document;

@Schema({ timestamps: true })
export class Pod {
    @Prop({ required: true, unique: true })
    podId!: string;

    @Prop({ required: true })
    host!: string;

    @Prop({ type: Number, required: true })
    apiPort!: number;

    @Prop({ type: Number, required: true })
    rtspPort!: number;

    @Prop({ type: Number, required: true })
    metricsPort!: number;

    @Prop({ required: true, enum: Object.values(PodRole) })
    type!: PodRole;

    @Prop({ default: PodStatus.ACTIVE, enum: Object.values(PodStatus) })
    status!: PodStatus;

    @Prop({ type: Date, default: Date.now })
    lastHeartbeatAt!: Date;
}

export const PodSchema = SchemaFactory.createForClass(Pod);
