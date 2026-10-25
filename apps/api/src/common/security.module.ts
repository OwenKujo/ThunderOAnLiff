import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminAuthGuard } from './auth/admin-auth.guard';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { issuer: 'thunder-oan-liff', audience: 'thunder-oan-liff-api' },
        verifyOptions: { issuer: 'thunder-oan-liff', audience: 'thunder-oan-liff-api' },
      }),
    }),
  ],
  providers: [AdminAuthGuard],
  exports: [JwtModule, AdminAuthGuard],
})
export class SecurityModule {}
