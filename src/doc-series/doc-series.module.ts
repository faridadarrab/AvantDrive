import { Module } from '@nestjs/common';
import { DocSeriesService } from './doc-series.service';
import { DocSeriesController } from './doc-series.controller';
import { PrismaModule } from '@/prisma';

@Module({
    imports: [PrismaModule],
    controllers: [DocSeriesController],
    providers: [DocSeriesService],
    exports: [DocSeriesService],
})
export class DocSeriesModule { }
