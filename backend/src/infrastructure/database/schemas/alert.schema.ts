import { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

import { AlertSeverity, AlertType } from "@/common";

export type AlertDocument = Alert & Document;

@Schema({ timestamps: true })
export class Alert {
    @Prop({ required: true })
    streamName!: string;

    @Prop({ required: true, enum: Object.values(AlertType) })
    type!: AlertType;

    @Prop({ required: true, enum: Object.values(AlertSeverity) })
    severity!: AlertSeverity;

    @Prop({ required: true })
    message!: string;

    @Prop({ default: false })
    isResolved!: boolean;

    @Prop({ default: null })
    resolvedAt?: Date;
}

export const AlertSchema = SchemaFactory.createForClass(Alert);
