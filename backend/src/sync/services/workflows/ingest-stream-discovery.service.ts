import { Injectable } from "@nestjs/common";

import { StreamStatus } from "@/common";
import { Stream, StreamMetadata, StreamsFacadeService } from "@/streams";

import { SyncDiscoveredStream } from "../../domain";

@Injectable()
export class IngestStreamDiscoveryService {
    constructor(private readonly streams: StreamsFacadeService) {}

    async upsertDiscoveredStream(ingest: SyncDiscoveredStream): Promise<Stream> {
        return this.streams.upsertFromDiscovery({
            name: ingest.name,
            source: ingest.source,
            status: (ingest.status as StreamStatus) || StreamStatus.DISCOVERED,
            metadata: this.buildDiscoveryMetadata(ingest),
            lastSeenAt: new Date(),
            isEnabled: true,
        });
    }

    private buildDiscoveryMetadata(ingest: SyncDiscoveredStream): StreamMetadata {
        return { ...ingest.video, ...ingest.audio, ...ingest.metadata };
    }
}
