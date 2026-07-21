import { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

import { NodeRole, NodeStatus } from "@/common";

export type NodeDocument = Node & Document;

@Schema({ timestamps: true })
export class Node {
    @Prop({ required: true, unique: true })
    nodeId!: string;

    @Prop({ required: true })
    host!: string;

    @Prop({ type: Number, required: true })
    apiPort!: number;

    @Prop({ type: Number, required: true })
    rtspPort!: number;

    @Prop({ type: Number, required: true })
    metricsPort!: number;

    @Prop({ required: true, enum: Object.values(NodeRole) })
    type!: NodeRole;

    @Prop({ default: NodeStatus.ACTIVE, enum: Object.values(NodeStatus) })
    status!: NodeStatus;

    @Prop({ type: Date, default: Date.now })
    lastHeartbeatAt!: Date;
}

export const NodeSchema = SchemaFactory.createForClass(Node);
