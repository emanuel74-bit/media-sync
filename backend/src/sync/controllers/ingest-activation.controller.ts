import { ApiTags } from "@nestjs/swagger";
import { Body, Controller, HttpCode, Param, Post } from "@nestjs/common";

import { StreamReadyDto } from "../dto";
import { IngestStreamSynchronizerService } from "../services";

/**
 * Low-latency activation hook. An ingest MediaMTX node calls this from `pathDefaults.runOnReady`
 * the moment a path starts publishing, so the sync loop relays *that* stream to a cluster node
 * without waiting for the next poll — a targeted relay from the hook's `(podId, name)`, no
 * whole-cluster scan. Node-sourced (trustworthy) — the client never calls it.
 *
 * Awaits the relay and returns 202; a failure surfaces as a 5xx to the node's hook.
 */
@ApiTags("pods")
@Controller("api/pods")
export class IngestActivationController {
    constructor(private readonly synchronizer: IngestStreamSynchronizerService) {}

    @Post(":podId/stream-ready")
    @HttpCode(202)
    async streamReady(
        @Param("podId") podId: string,
        @Body() dto: StreamReadyDto,
    ): Promise<{ accepted: boolean }> {
        await this.synchronizer.activate(podId, dto.name);
        return { accepted: true };
    }
}
