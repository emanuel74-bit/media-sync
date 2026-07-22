import { Injectable, Logger } from "@nestjs/common";

import { Stream, StreamsFacadeService } from "@/streams";

import { SyncContext } from "../../domain";

@Injectable()
export class StreamReconcileService {
    private readonly logger = new Logger(StreamReconcileService.name);

    constructor(private readonly streams: StreamsFacadeService) {}

    async execute(context: SyncContext): Promise<void> {
        const manualStreams = context.allStreams.filter(
            (stream) => stream.isManual && stream.isEnabled,
        );
        for (const stream of manualStreams) {
            try {
                await this.reconcileStream(stream, context.clusterNames, context.nodeIds);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                this.logger.error(`Failed manual sync for ${stream.name}: ${message}`);
            }
        }
    }

    private async reconcileStream(
        stream: Stream,
        clusterNames: Set<string>,
        nodeIds: string[],
    ): Promise<void> {
        const assigned = await this.streams.ensureAssigned(stream.name, nodeIds);

        if (!clusterNames.has(assigned.name)) {
            await this.streams.buildClusterPipeline(assigned);
        }
    }
}
