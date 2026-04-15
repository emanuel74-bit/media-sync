import { IsString } from "class-validator";

export class AssignStreamDto {
    @IsString()
    podId!: string;
}
