import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
export class CreateClassDto {
  @IsString() @MinLength(2) @MaxLength(120) title!: string;
  @IsString() @MinLength(1) @MaxLength(100) trainerId!: string;
  @IsDateString() startAt!: string;
  @IsDateString() endAt!: string;
  @IsInt() @Min(1) capacity!: number;
  @IsOptional() @IsString() @MaxLength(200) location?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
