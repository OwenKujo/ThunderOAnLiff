import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
export class CreatePaymentDto {
  @IsString() @MinLength(1) traineeId!: string;
  @IsString() @MinLength(1) packageId!: string;
  @IsInt() @Min(0) amountCents!: number;
  @IsString() @MinLength(2) @MaxLength(60) paymentMethod!: string;
  @IsOptional() @IsString() @MaxLength(150) paymentReference?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
