import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTraineeDto {
  @IsString() @MinLength(1) @MaxLength(80) firstName!: string;
  @IsString() @MinLength(1) @MaxLength(80) lastName!: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
}
