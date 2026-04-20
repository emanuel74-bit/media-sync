import { IsString } from "class-validator";

export class HeartbeatDto {
    @IsString()
    podId!: string;
}
