import { IsString, Matches } from "class-validator";

/** Payload an ingest node posts from its `runOnReady` hook when a path starts publishing. */
export class StreamReadyDto {
    /** The path/stream name that just went live. Path-safe characters only (MediaMTX rules). */
    @IsString()
    @Matches(/^[A-Za-z0-9_-]+$/, {
        message: "name may only contain letters, digits, underscores and hyphens",
    })
    name!: string;
}
