import { Injectable } from "@nestjs/common";

import { Stream } from "../../../streams/domain";
import { SyncContext, SyncWorkflow } from "../../domain";
import { StreamAssignmentService } from "../../../streams/services/assignment";
import { StreamProvisioningService } from "../../../streams/services/lifecycle";

@Injectable()
export class StreamReconcileService implements SyncWorkflow {
    constructor(
        private readonly streamAssignment: StreamAssignmentService,
        private readonly streamProvisioning: StreamProvisioningService,
    ) {}

    async reconcileAll(
        allStreams: Stream[],
        clusterNames: Set<string>,
        podIds: string[],
    ): Promise<void> {
        const manualStreams = allStreams.filter(
            (stream) => stream.isManual && stream.isEnabled !== false,
        );
        for (const stream of manualStreams) {
            await this.reconcileStream(stream, clusterNames, podIds);
        }
    }

    async reconcileStream(
        stream: Stream,
        clusterNames: Set<string>,
        podIds: string[],
    ): Promise<void> {
        const assigned = await this.streamAssignment.ensureAssigned(stream.name, podIds);
        if (!clusterNames.has(stream.name)) {
            await this.streamProvisioning.provisionClusterPipeline(assigned);
        }
    }

    async execute(context: SyncContext): Promise<void> {
        await this.reconcileAll(context.allStreams, context.clusterNames, context.podIds);
    }
}
