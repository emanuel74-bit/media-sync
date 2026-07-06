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

// At most one OPEN alert per (source, subject, type). Backs the reconciler's
// idempotent create: a concurrent insert hits this constraint and the server's
// upsert retry collapses it to the existing alert instead of a duplicate.
// Partial filter so resolved alerts (the history) are exempt.
AlertSchema.index(
    { source: 1, subject: 1, type: 1 },
    { unique: true, partialFilterExpression: { isResolved: false } },
);
