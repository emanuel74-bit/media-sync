import { Injectable } from "@nestjs/common";

import { MediaMtxClient } from "../../clients";
import { CachingClientFactory } from "./caching-client-factory";

/**
 * Creates and caches MediaMtxClient instances by base URL.
 * Prevents duplicate client creation for the same endpoint.
 */
@Injectable()
export class MediaMtxClientFactory extends CachingClientFactory<MediaMtxClient> {
    protected create(baseUrl: string): MediaMtxClient {
        return new MediaMtxClient(baseUrl);
    }
}
