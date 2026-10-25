import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { z } from 'zod';
import { resolve } from 'node:path';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { TraineesModule } from './trainees/trainees.module';
import { PackagesModule } from './packages/packages.module';
import { PaymentsModule } from './payments/payments.module';
import { TrainersModule } from './trainers/trainers.module';
import { ClassesModule } from './classes/classes.module';
import { BookingsModule } from './bookings/bookings.module';
import { AttendanceModule } from './attendance/attendance.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LineModule } from './line/line.module';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters.'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174,http://localhost:5175'),
}).passthrough();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '.env.local'), resolve(process.cwd(), '../../.env'), resolve(process.cwd(), '../../.env.local')],
      validate: (env) => environmentSchema.parse(env),
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    TraineesModule,
    PackagesModule,
    PaymentsModule,
    TrainersModule,
    ClassesModule,
    BookingsModule,
    AttendanceModule,
    DashboardModule,
    LineModule,
  ],
})
export class AppModule {}
