import { IsString, MinLength } from 'class-validator';
import { CreateBookingDto } from './create-booking.dto';

export class CreateAdminBookingDto extends CreateBookingDto {
  @IsString() @MinLength(1) traineeId!: string;
}
