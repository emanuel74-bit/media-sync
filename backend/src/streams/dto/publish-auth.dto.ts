import { IsOptional, IsString } from "class-validator";

/**
 * Request an ingest node posts to the publish-auth endpoint (MediaMTX `authMethod: http`) for
 * every non-excluded action. Only the fields the auth check needs are typed; the rest (ip,
 * protocol, id, query, …) are accepted but ignored.
 */
export class PublishAuthDto {
    @IsString()
    action!: string;

    @IsOptional()
    @IsString()
    path?: string;

    @IsOptional()
    @IsString()
    user?: string;

    @IsOptional()
    @IsString()
    password?: string;

    @IsOptional()
    @IsString()
    token?: string;
}
