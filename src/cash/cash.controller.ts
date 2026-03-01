import {
    Controller, Get, Post, Patch, Body, Param, ParseUUIDPipe, UseGuards,
} from '@nestjs/common';
import { CashService } from './cash.service';
import { OpenCashSessionDto, CloseCashSessionDto, CreateCashMovementDto } from './dto/cash.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('cash')
export class CashController {
    constructor(private readonly cash: CashService) { }

    @Post('sessions')
    openSession(@Body() dto: OpenCashSessionDto) { return this.cash.openSession(dto); }

    @Get('sessions')
    findAllSessions() { return this.cash.findAllSessions(); }

    @Patch('sessions/:id/close')
    closeSession(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CloseCashSessionDto) {
        return this.cash.closeSession(id, dto);
    }

    @Get('sessions/:id/summary')
    getSessionSummary(@Param('id', ParseUUIDPipe) id: string) {
        return this.cash.getSessionSummary(id);
    }

    @Post('movements')
    createMovement(@Body() dto: CreateCashMovementDto) { return this.cash.createMovement(dto); }

    @Get('movements')
    findMovements() { return this.cash.findAllSessions(); } // Listing via sessions
}
