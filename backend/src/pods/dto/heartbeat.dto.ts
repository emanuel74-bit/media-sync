import { Type } from "class-transformer";
import { IsObject, IsOptional, IsString, ValidateNested } from "class-validator";

import { PodResourcesDto } from "./pod-resources.dto";

export class HeartbeatDto {
    @IsString()
    podId!: string;

    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => PodResourcesDto)
    resources?: PodResourcesDto;
}
