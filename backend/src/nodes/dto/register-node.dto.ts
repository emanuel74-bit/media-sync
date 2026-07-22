import { Type } from "class-transformer";
import { IsEnum, IsInt, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";

import { NodeRole } from "@/common";

import { NodeResourcesDto } from "./node-resources.dto";

export class RegisterNodeDto {
    @IsString()
    nodeId!: string;

    @IsString()
    host!: string;

    @IsOptional()
    @IsInt()
    apiPort?: number;

    @IsOptional()
    @IsInt()
    rtspPort?: number;

    @IsOptional()
    @IsInt()
    metricsPort?: number;

    @IsEnum(NodeRole)
    type!: NodeRole;

    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => NodeResourcesDto)
    resources?: NodeResourcesDto;
}
