import { Injectable } from "@nestjs/common";

import { MediaMtxClient } from "../clients";

/**
 * Creates and caches MediaMtxClient instances by base URL.
 * Prevents duplicate client creation for the same endpoint.
 */
@Injectable()
export class MediaMtxClientFactory {
    private readonly cache = new Map<string, MediaMtxClient>();

    getOrCreate(baseUrl: string): MediaMtxClient {
        let client = this.cache.get(baseUrl);
        if (!client) {
            client = new MediaMtxClient(baseUrl);
            this.cache.set(baseUrl, client);
        }
        return client;
    }
}
