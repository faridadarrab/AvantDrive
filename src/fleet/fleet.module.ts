import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { FleetService } from './fleet.service';
import { FleetController } from './fleet.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FleetGateway } from './fleet.gateway';

@Module({
  imports: [PrismaModule, EventEmitterModule.forRoot()],
  controllers: [FleetController],
  providers: [FleetService, FleetGateway],
  exports: [FleetService],
})
export class FleetModule { }
