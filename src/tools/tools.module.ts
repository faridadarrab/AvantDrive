import { Module } from '@nestjs/common';
import { ToolsController } from './tools.controller';
import { ToolsService } from './tools.service';
import { PrismaModule } from '@/prisma';

@Module({
    imports: [PrismaModule],
    controllers: [ToolsController],
    providers: [ToolsService],
    exports: [ToolsService],
})
export class ToolsModule { }
