import { IsOptional, IsString, Matches, MaxLength, IsUrl } from 'class-validator';

export class LinkAccountDto {
  @IsString() @Matches(/^[A-Fa-f0-9]{16}$/) code!: string;
  @IsOptional() @IsString() @MaxLength(100) displayName?: string;
  @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(500) pictureUrl?: string;
}
