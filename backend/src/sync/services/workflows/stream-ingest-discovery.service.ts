import { Injectable } from "@nestjs/common";

import { StreamStatus } from "../../../common";
import { SyncDiscoveredStream } from "../../domain";
import { Stream, StreamMetadata } from "../../../streams/domain";
import { StreamStatusService } from "../../../streams/services/lifecycle";

function buildDiscoveryMetadata(ingest: SyncDiscoveredStream): StreamMetadata {
    return { ...ingest.video, ...ingest.audio, ...ingest.metadata };
}

@Injectable()
export class StreamIngestDiscoveryService {
    constructor(private readonly streamStatus: StreamStatusService) {}

    async upsertDiscoveredStream(ingest: SyncDiscoveredStream): Promise<Stream> {
        return this.streamStatus.upsertFromDiscovery({
            name: ingest.name,
            source: ingest.source,
            status: (ingest.status as StreamStatus) || StreamStatus.DISCOVERED,
            metadata: buildDiscoveryMetadata(ingest),
            lastSeenAt: new Date(),
            enabled: true,
        });
    }
}
