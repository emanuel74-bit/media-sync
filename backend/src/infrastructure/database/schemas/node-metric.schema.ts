import { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

import { PodRole } from "@/common";

export type NodeMetricDocument = NodeMetric & Document;

/** Operational counters for a whole MediaMTX node, sampled from its /metrics endpoint. */
@Schema({ timestamps: true, collection: "nodemetrics" })
export class NodeMetric {
    @Prop({ required: true, enum: Object.values(PodRole) })
    context!: PodRole;

    @Prop({ required: true })
    node!: string;

    @Prop({ required: true })
    paths!: number;

    @Prop({ required: true })
    rtspConns!: number;

    @Prop({ required: true })
    rtspSessions!: number;

    @Prop({ required: true })
    rtmpConns!: number;

    @Prop({ required: true })
    srtConns!: number;

    @Prop({ required: true })
    webrtcSessions!: number;

    @Prop({ required: true })
    hlsMuxers!: number;
}

export const NodeMetricSchema = SchemaFactory.createForClass(NodeMetric);
