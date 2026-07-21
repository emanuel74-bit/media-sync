import { randomBytes } from "node:crypto";

import { EventEmitter2 } from "@nestjs/event-emitter";
import { ConflictException, Injectable } from "@nestjs/common";

import { ConfigService } from "@/config";
import { SystemEventNames } from "@/common";
import { NodeResolver } from "@/media-nodes";

import { StreamQueryService } from "../query";
import { StreamCrudService } from "../mutation";
import { StreamReservation } from "../../domain";
import { IngestPlacementService } from "../assignment";

/**
 * The ingest birth flow (`POST /api/ingest/streams`): reserves a publish slot on an ingest node
 * and returns the coordinates to publish to. It places the reservation on the least-loaded node
 * (`IngestPlacementService`), mints an opaque publish secret, and records a `RESERVED` stream.
 * It does **not** assign a cluster node or deploy — the client publishes to the returned URL and
 * the sync reconcile loop relays the now-live stream later.
 */
@Injectable()
export class StreamReservationService {
    constructor(
        private readonly streamQuery: StreamQueryService,
        private readonly streamCrud: StreamCrudService,
        private readonly ingestPlacement: IngestPlacementService,
        private readonly nodes: NodeResolver,
        private readonly config: ConfigService,
        private readonly events: EventEmitter2,
    ) {}

    async reserve(name: string): Promise<StreamReservation> {
        if (await this.streamQuery.findByName(name)) {
            throw new ConflictException(`Stream ${name} already exists`);
        }

        const ingestNode = await this.ingestPlacement.selectNode();
        const expiresAt = new Date(Date.now() + this.config.ingestReservationTtlMs);
        const publishToken = randomBytes(24).toString("base64url");
        const source = await this.nodes.getIngestRtspUrl(ingestNode, name);

        await this.streamCrud.createReservation({
            name,
            source,
            ingestNode,
            reservedUntil: expiresAt,
            publishToken,
        });
        this.events.emit(SystemEventNames.STREAM_RESERVED, {
            streamName: name,
            ingestNode,
            expiresAt,
        });

        const publishUrl = this.withCredentials(source, publishToken);
        return { name, ingestNode, publishUrl, publishToken, expiresAt };
    }

    /** Embed the publish user + secret as RTSP userinfo so the client URL is ready to use. */
    private withCredentials(rtspUrl: string, secret: string): string {
        const userinfo = `${encodeURIComponent(this.config.ingestPublishUser)}:${encodeURIComponent(secret)}@`;
        return rtspUrl.replace("rtsp://", `rtsp://${userinfo}`);
    }
}
