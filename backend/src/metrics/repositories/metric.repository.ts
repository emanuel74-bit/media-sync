import { Metric } from "../domain";
import { NewMetricData } from "../domain/metric-creation.domain";
import { PodRole } from "../../common";

export abstract class MetricRepository {
    abstract findRecent(streamName: string, limit: number): Promise<Metric[]>;

    abstract save(data: NewMetricData): Promise<Metric>;
}
