import { Injectable } from "@nestjs/common";

import { MediaMtxMetricsClient } from "../../clients";
import { CachingClientFactory } from "./caching-client-factory";

/**
 * Creates and caches MediaMtxMetricsClient instances by URL.
 * The Prometheus /metrics counterpart to MediaMtxClientFactory — one client per endpoint.
 */
@Injectable()
export class MediaMtxMetricsClientFactory extends CachingClientFactory<MediaMtxMetricsClient> {
    protected create(url: string): MediaMtxMetricsClient {
        return new MediaMtxMetricsClient(url);
    }
}
