import { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

import { AlertType, AlertSource, AlertSeverity } from "@/common";

export type AlertDocument = Alert & Document;

@Schema({ timestamps: true })
export class Alert {
    @Prop({ required: true, enum: Object.values(AlertSource) })
    source!: AlertSource;

    @Prop({ required: true })
    subject!: string;

    @Prop({ required: true, enum: Object.values(AlertType) })
    type!: AlertType;

    @Prop({ required: true, enum: Object.values(AlertSeverity) })
    severity!: AlertSeverity;

    @Prop({ required: true })
    message!: string;

    @Prop({ default: false })
    isResolved!: boolean;

    @Prop({ type: Date, default: Date.now })
    lastSeenAt!: Date;

    @Prop({ default: null })
    resolvedAt?: Date;
}

export const AlertSchema = SchemaFactory.createForClass(Alert);
