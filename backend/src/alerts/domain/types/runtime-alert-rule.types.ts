import { AlertType, AlertSeverity } from "@/common";

export type RuntimeAlertRule<TInput, TContext> = {
    check: (input: TInput, context: TContext) => boolean;
    type: AlertType;
    severity: AlertSeverity;
    message: (input: TInput) => string;
};