import { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

import { NodeRole } from "@/common";

export type PathMetricDocument = PathMetric & Document;

/** Operational data for one path on one MediaMTX node, sampled from its /metrics endpoint. */
@Schema({ timestamps: true, collection: "pathmetrics" })
export class PathMetric {
    @Prop({ required: true })
    streamName!: string;

    @Prop({ required: true, enum: Object.values(NodeRole) })
    context!: NodeRole;

    @Prop({ required: true })
    node!: string;

    @Prop({ required: true })
    state!: string;

    @Prop({ required: true })
    ready!: boolean;

    @Prop({ required: true })
    bytesReceived!: number;

    @Prop({ required: true })
    bytesSent!: number;

    @Prop({ required: true })
    readers!: number;

    @Prop({ required: true })
    framesInError!: number;
}

export const PathMetricSchema = SchemaFactory.createForClass(PathMetric);
