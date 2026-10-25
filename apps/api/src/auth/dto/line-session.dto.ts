import { IsString, MaxLength, MinLength } from 'class-validator';

export class LineSessionDto {
  @IsString() @MinLength(100) @MaxLength(5000) idToken!: string;
}
