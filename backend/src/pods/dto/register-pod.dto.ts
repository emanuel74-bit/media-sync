import { IsArray, IsEnum, IsOptional, IsString } from "class-validator";

import { PodRole } from "@/common";

export class RegisterPodDto {
    @IsString()
    podId!: string;

    @IsOptional()
    @IsString()
    host?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @IsOptional()
    @IsEnum(PodRole)
    type?: PodRole;
}
