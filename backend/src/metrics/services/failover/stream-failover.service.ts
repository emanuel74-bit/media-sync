import { Injectable, Logger } from "@nestjs/common";

import { PodRole } from "@/common";
import { ConfigService } from "@/config";
import { PodQueryService } from "@/pods";
import { isMetricDegraded } from "@/common";

import { Metric } from "../../domain";
import { MetricFailoverStreamGatewayService } from "./metric-failover-stream-gateway.service";

@Injectable()
export class StreamFailoverService {
    private readonly logger = new Logger(StreamFailoverService.name);

    constructor(
        private readonly config: ConfigService,
        private readonly failoverStreams: MetricFailoverStreamGatewayService,
        private readonly podsService: PodQueryService,
    ) {}

    async evaluateAndReassignIfDegraded(
        streamName: string,
        context: PodRole,
        metric: Metric,
    ): Promise<void> {
        if (context !== PodRole.CLUSTER) {
            return;
        }

        if (
            !isMetricDegraded(metric, {
                alertPacketLossThreshold: this.config.alertPacketLossThreshold,
                alertLatencyHighThreshold: this.config.alertLatencyHighThreshold,
            })
        ) {
            return;
        }

        const stream = await this.failoverStreams.findAssignedStream(streamName);
        if (!stream) {
            return;
        }

        const candidates = await this.podsService.listActivePodIds(PodRole.CLUSTER);
        if (candidates.length <= 1) {
            return;
        }

        const reassigned = await this.failoverStreams.reassignStream(streamName, candidates);
        if (reassigned.assignedPod !== stream.assignedPod) {
            this.logger.warn(
                `Reassigned ${streamName} from ${stream.assignedPod} to ${reassigned.assignedPod}`,
            );
        }
    }
}
