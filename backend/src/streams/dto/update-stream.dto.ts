import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

import { StreamStatus } from "@/common";

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
