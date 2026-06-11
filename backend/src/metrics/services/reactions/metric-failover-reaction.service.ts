import { Injectable } from "@nestjs/common";

import { PodRole } from "@/common";

import { Metric } from "../../domain";
import { StreamFailoverService } from "../failover";

@Injectable()
export class MetricFailoverReactionService {
    constructor(private readonly streamFailover: StreamFailoverService) {}

    async handleCollectedMetric(
        streamName: string,
        context: PodRole,
        metric: Metric,
    ): Promise<void> {
        if (context !== PodRole.CLUSTER) {
            return;
        }

        await this.streamFailover.evaluateAndReassignIfDegraded(streamName, metric);
    }
}
