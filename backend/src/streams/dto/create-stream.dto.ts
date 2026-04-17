import { IsBoolean, IsOptional, IsString } from "class-validator";

export class CreateStreamDto {
    @IsString()
    name!: string;

    @IsString()
    source!: string;

    @IsOptional()
    @IsBoolean()
    isEnabled?: boolean;
}
