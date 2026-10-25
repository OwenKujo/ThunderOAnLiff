import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class CreateTrainerDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsOptional() @IsString() @MaxLength(300) specialty?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
