import { AlertType } from "../domain/alert-type.enum";
import { AlertSeverity } from "../domain/alert-severity.enum";

export type RuntimeAlertRule<TInput, TContext> = {
    check: (input: TInput, context: TContext) => boolean;
    type: AlertType;
    severity: AlertSeverity;
    message: (input: TInput) => string;
};
