import { IsString, Matches } from "class-validator";

export class ReserveStreamDto {
    /** Unique stream/path name. Restricted to path-safe characters (MediaMTX path rules). */
    @IsString()
    @Matches(/^[A-Za-z0-9_-]+$/, {
        message: "name may only contain letters, digits, underscores and hyphens",
    })
    name!: string;
}
