import { Injectable, Logger } from "@nestjs/common";

import { PodRole } from "@/common";
import { Metric } from "@/metrics";
import { ConfigService } from "@/config";
import { PodQueryService } from "@/pods";
import { isMetricDegraded } from "@/common";
import { StreamQueryService } from "@/streams";
import { StreamAssignmentService } from "@/streams";

@Injectable()
export class StreamFailoverService {
    private readonly logger = new Logger(StreamFailoverService.name);

    constructor(
        private readonly config: ConfigService,
        private readonly streamQuery: StreamQueryService,
        private readonly streamAssignment: StreamAssignmentService,
        private readonly podsService: PodQueryService,
    ) {}

    async evaluateAndReassignIfDegraded(streamName: string, metric: Metric): Promise<void> {
        if (
            !isMetricDegraded(metric, {
                alertPacketLossThreshold: this.config.alertPacketLossThreshold,
                alertLatencyHighThreshold: this.config.alertLatencyHighThreshold,
            })
        ) {
            return;
        }

        const stream = await this.streamQuery.findAssignedByName(streamName);
        if (!stream) {
            return;
        }

        const candidates = await this.podsService.listActivePodIds(PodRole.CLUSTER);
        if (candidates.length <= 1) {
            return;
        }

        const reassigned = await this.streamAssignment.reassign(streamName, candidates);
        if (reassigned.assignedPod !== stream.assignedPod) {
            this.logger.warn(
                `Reassigned ${streamName} from ${stream.assignedPod} to ${reassigned.assignedPod}`,
            );
        }
    }
}
