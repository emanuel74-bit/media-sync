import { Injectable, Logger } from "@nestjs/common";

import { Stream } from "@/streams";
import { SyncContext, SyncWorkflow } from "@/sync";
import { StreamAssignmentService } from "@/streams";
import { MediaMtxPipelineService } from "@/infrastructure";

@Injectable()
export class StreamReconcileService implements SyncWorkflow {
    readonly name = "StreamReconcile";
    private readonly logger = new Logger(StreamReconcileService.name);

    constructor(
        private readonly mediaMtxPipeline: MediaMtxPipelineService,
        private readonly streamAssignment: StreamAssignmentService,
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
        await this.streamAssignment.ensureAssigned(stream.name, podIds);

        if (!clusterNames.has(stream.name)) {
            try {
                await this.mediaMtxPipeline.createClusterPullPipeline({
                    name: stream.name,
                    source: stream.source,
                    status: stream.status,
                });
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                this.logger.error(`Failed manual sync create for ${stream.name}: ${message}`);
            }
        }
    }

    async execute(context: SyncContext): Promise<void> {
        await this.reconcileAll(context.allStreams, context.clusterNames, context.podIds);
    }
}
