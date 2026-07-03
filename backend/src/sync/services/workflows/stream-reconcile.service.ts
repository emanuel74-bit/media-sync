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
            await this.reconcileStream(stream, context.clusterNames, context.podIds);
        }
    }

    private async reconcileStream(
        stream: Stream,
        clusterNames: Set<string>,
        podIds: string[],
    ): Promise<void> {
        await this.streams.ensureAssigned(stream.name, podIds);

        if (!clusterNames.has(stream.name)) {
            try {
                await this.streams.buildClusterPipeline(stream);
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                this.logger.error(`Failed manual sync create for ${stream.name}: ${message}`);
            }
        }
    }
}
