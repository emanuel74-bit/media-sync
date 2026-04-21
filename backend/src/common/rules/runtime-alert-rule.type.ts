import { AlertType } from "../domain/enums/alert-type.enum";
import { AlertSeverity } from "../domain/enums/alert-severity.enum";
export type RuntimeAlertRule<TInput, TContext> = {
    check: (input: TInput, context: TContext) => boolean;
    type: AlertType;
    severity: AlertSeverity;
    message: (input: TInput) => string;
};
