import { Module } from '@nestjs/common';
import { SecurityModule } from '../common/security.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TrainersController } from './trainers.controller';
@Module({ imports: [PrismaModule, SecurityModule], controllers: [TrainersController] })
export class TrainersModule {}
