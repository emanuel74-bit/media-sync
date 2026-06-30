import { Type } from "class-transformer";
import { IsEnum, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";

import { PodRole } from "@/common";

import { PodResourcesDto } from "./pod-resources.dto";

export class RegisterPodDto {
    @IsString()
    podId!: string;

    @IsString()
    host!: string;

    @IsEnum(PodRole)
    type!: PodRole;

    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => PodResourcesDto)
    resources?: PodResourcesDto;
}
