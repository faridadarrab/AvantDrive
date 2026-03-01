import { Module } from '@nestjs/common';
import { SatService } from './sat.service';
import { SatController } from './sat.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [SatService],
    controllers: [SatController],
    exports: [SatService],
})
export class SatModule { }
