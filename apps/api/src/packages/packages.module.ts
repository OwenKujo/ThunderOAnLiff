import { Module } from '@nestjs/common';
import { SecurityModule } from '../common/security.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PackagesController } from './packages.controller';
import { PackagesService } from './packages.service';

@Module({ imports: [PrismaModule, SecurityModule], controllers: [PackagesController], providers: [PackagesService], exports: [PackagesService] })
export class PackagesModule {}
