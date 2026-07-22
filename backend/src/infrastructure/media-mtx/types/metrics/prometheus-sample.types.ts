/** One parsed line of the Prometheus text exposition format. */
export interface PrometheusSample {
    name: string;
    labels: Record<string, string>;
    value: number;
}
