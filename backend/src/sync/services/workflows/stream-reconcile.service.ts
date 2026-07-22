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
            await this.reconcileStream(stream, context.clusterNames, context.nodeIds);
        }
    }

    private async reconcileStream(
        stream: Stream,
        clusterNames: Set<string>,
        nodeIds: string[],
    ): Promise<void> {
        const assigned = await this.streams.ensureAssigned(stream.name, nodeIds);

        if (!clusterNames.has(assigned.name)) {
            try {
                await this.streams.buildClusterPipeline(assigned);
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                this.logger.error(`Failed manual sync create for ${stream.name}: ${message}`);
            }
        }
    }
}
