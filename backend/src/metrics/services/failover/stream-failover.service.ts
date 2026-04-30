import { Injectable, Logger } from "@nestjs/common";

import { PodRole } from "@/common";
import { PodQueryService } from "@/pods";
import { isMetricDegraded } from "@/common";
import { StreamsFacadeService } from "@/streams";
import { RuntimeConfigService } from "@/runtime-config";

import { Metric } from "../../domain/types/metric.types";

@Injectable()
export class StreamFailoverService {
    private readonly logger = new Logger(StreamFailoverService.name);

    constructor(
        private readonly config: RuntimeConfigService,
        private readonly streams: StreamsFacadeService,
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

        const stream = await this.streams.findAssignedByName(streamName);
        if (!stream) {
            return;
        }

        const candidates = await this.podsService.listActivePodIds(PodRole.CLUSTER);
        if (candidates.length <= 1) {
            return;
        }

        const reassigned = await this.streams.reassign(streamName, candidates);
        if (reassigned.assignedPod !== stream.assignedPod) {
            this.logger.warn(
                `Reassigned ${streamName} from ${stream.assignedPod} to ${reassigned.assignedPod}`,
            );
        }
    }
}
