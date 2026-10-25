import { Module } from '@nestjs/common';
import { SecurityModule } from '../common/security.module';
import { LineModule } from '../line/line.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TraineesController } from './trainees.controller';
import { TraineesService } from './trainees.service';

@Module({ imports: [PrismaModule, SecurityModule, LineModule], controllers: [TraineesController], providers: [TraineesService], exports: [TraineesService] })
export class TraineesModule {}
