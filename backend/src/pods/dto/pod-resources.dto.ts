import { Max, Min, IsNumber } from "class-validator";

/** Host resource usage a pod reports with register/heartbeat (percentages 0–100). */
export class PodResourcesDto {
    @IsNumber()
    @Min(0)
    @Max(100)
    cpu!: number;

    @IsNumber()
    @Min(0)
    @Max(100)
    memory!: number;

    @IsNumber()
    @Min(0)
    @Max(100)
    disk!: number;
}
