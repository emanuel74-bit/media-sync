import { Injectable } from "@nestjs/common";

import { PublishAuthDto } from "../../dto";
import { StreamQueryService } from "./stream-query.service";

/**
 * Authorizes an ingest-node publish attempt against the reservation table. An ingest MediaMTX
 * node (`authMethod: http`) calls the auth endpoint for each `publish`; the client's publish URL
 * carries the per-reservation secret as RTSP credentials, so the node forwards it here. Publish
 * is allowed only when a stream reserved that exact path holds a matching secret — which also
 * lets a legitimate publisher reconnect for the life of the stream. Control-plane actions
 * (api/metrics) and the internal relay read are excluded at the node and never reach here; any
 * other action is denied.
 */
@Injectable()
export class PublishAuthService {
    constructor(private readonly streamQuery: StreamQueryService) {}

    async isAuthorized(request: PublishAuthDto): Promise<boolean> {
        if (request.action !== "publish" || !request.path) {
            return false;
        }

        const stream = await this.streamQuery.findByName(request.path);
        const secret = stream?.publishToken;
        if (!secret) {
            return false;
        }

        const presented = request.password || request.token;
        return presented === secret;
    }
}
