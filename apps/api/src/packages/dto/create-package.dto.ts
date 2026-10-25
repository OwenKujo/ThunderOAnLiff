import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { PackageType } from '@prisma/client';

export class CreatePackageDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsEnum(PackageType) type!: PackageType;
  @IsInt() @Min(0) priceCents!: number;
  @IsOptional() @IsInt() @Min(1) sessionCount?: number | null;
  @IsOptional() @IsInt() @Min(1) durationDays?: number | null;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
