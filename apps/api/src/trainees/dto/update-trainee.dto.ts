import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { MemberStatus } from '@prisma/client';

export class UpdateTraineeDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) firstName?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) lastName?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string | null;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string | null;
  @IsOptional() @IsEnum(MemberStatus) memberStatus?: MemberStatus;
}
