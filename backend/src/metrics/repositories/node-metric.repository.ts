import { NodeMetric, NewNodeMetricData } from "../domain";

export abstract class NodeMetricRepository {
    abstract saveMany(data: NewNodeMetricData[]): Promise<void>;

    abstract findRecent(limit: number): Promise<NodeMetric[]>;
}
