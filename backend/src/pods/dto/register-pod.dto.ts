import { Type } from "class-transformer";
import { IsArray, IsEnum, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";

import { PodRole } from "@/common";

import { PodResourcesDto } from "./pod-resources.dto";

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

    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => PodResourcesDto)
    resources?: PodResourcesDto;
}
