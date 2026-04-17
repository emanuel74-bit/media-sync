import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

import { StreamStatus } from "../../common/domain";

export class UpdateStreamDto {
    @IsOptional()
    @IsString()
    source?: string;

    @IsOptional()
    @IsBoolean()
    isEnabled?: boolean;

    @IsOptional()
    @IsEnum(StreamStatus)
    status?: StreamStatus;
}
