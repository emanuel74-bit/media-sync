import { ApiTags } from "@nestjs/swagger";
import { Body, Controller, HttpCode, Post, UnauthorizedException } from "@nestjs/common";

import { PublishAuthDto } from "../dto";
import { PublishAuthService } from "../services";

/**
 * Auth backend for ingest MediaMTX nodes (`authMethod: http`, `authHTTPAddress`). MediaMTX
 * POSTs each publish attempt here; a 200 permits it, any non-2xx denies. Called node-to-sync,
 * not by clients.
 */
@ApiTags("ingest")
@Controller("api/ingest")
export class IngestAuthController {
    constructor(private readonly auth: PublishAuthService) {}

    @Post("auth")
    @HttpCode(200)
    async authorize(@Body() dto: PublishAuthDto): Promise<{ authorized: true }> {
        if (!(await this.auth.isAuthorized(dto))) {
            throw new UnauthorizedException("Publish not authorized for this path");
        }
        return { authorized: true };
    }
}
