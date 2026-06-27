import { PathMetric, NewPathMetricData } from "../domain";

export abstract class PathMetricRepository {
    abstract saveMany(data: NewPathMetricData[]): Promise<void>;

    abstract findRecent(streamName: string, limit: number): Promise<PathMetric[]>;
}
