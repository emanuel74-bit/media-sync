import { PodRole } from "@/common";

import { Metric, NewMetricData } from "../domain";

export abstract class MetricRepository {
    abstract findRecent(streamName: string, limit: number): Promise<Metric[]>;

    abstract save(data: NewMetricData): Promise<Metric>;
}
