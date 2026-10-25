import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SecurityModule } from '../common/security.module';
import { LineModule } from '../line/line.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [PrismaModule, SecurityModule, LineModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [SecurityModule, AuthService],
})
export class AuthModule {}
