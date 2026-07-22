import { Type } from "class-transformer";
import { IsObject, IsOptional, IsString, ValidateNested } from "class-validator";

import { NodeResourcesDto } from "./node-resources.dto";

export class HeartbeatDto {
    @IsString()
    nodeId!: string;

    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => NodeResourcesDto)
    resources?: NodeResourcesDto;
}
