import { AlertType, AlertSeverity } from "../domain";
export type RuntimeAlertRule<TInput, TContext> = {
    check: (input: TInput, context: TContext) => boolean;
    type: AlertType;
    severity: AlertSeverity;
    message: (input: TInput) => string;
};
