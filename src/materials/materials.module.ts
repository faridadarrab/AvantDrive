import { Module } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { MaterialsController } from './materials.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [MaterialsController],
  providers: [MaterialsService, PrismaService],
  exports: [MaterialsService],
})
export class MaterialsModule { }
