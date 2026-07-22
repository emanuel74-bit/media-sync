import { Module } from "@nestjs/common";

import { ConfigModule } from "@/config";

import {
    MediaMtxClientFactory,
    MediaMtxClientRegistry,
    MediaMtxMetricsClientFactory,
} from "./registry";

/**
 * The MediaMTX **gateway**: the driver that talks to MediaMTX nodes. Owns the HTTP
 * clients, their caching factories, and the registry that vends them. Holds no
 * application logic — the services that operate the nodes live in the `media-nodes`
 * feature, which imports this module and injects `MediaMtxClientRegistry` (ARCH-10).
 */
@Module({
    imports: [ConfigModule],
    providers: [MediaMtxClientFactory, MediaMtxMetricsClientFactory, MediaMtxClientRegistry],
    exports: [MediaMtxClientRegistry],
})
export class MediaMtxModule {}
