import { PodRole } from "@/common";

import { Metric } from "../domain/types/metric.types";
import { NewMetricData } from "../domain/types/metric-creation.types";

export abstract class MetricRepository {
    abstract findRecent(streamName: string, limit: number): Promise<Metric[]>;

    abstract save(data: NewMetricData): Promise<Metric>;
}
