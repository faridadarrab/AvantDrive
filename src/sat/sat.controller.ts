import {
    Controller, Get, Post, Patch, Delete,
    Body, Param, Query, ParseUUIDPipe, UseGuards,
} from '@nestjs/common';
import { SatService } from './sat.service';
import { CreateOrdenTrabajoDto } from './dto/create-orden-trabajo.dto';
import { UpdateOrdenTrabajoDto } from './dto/update-orden-trabajo.dto';
import { CreatePresupuestoDto } from './dto/create-presupuesto.dto';
import { CreatePagoDto } from './dto/create-pago.dto';
import { CreateResguardoDto } from './dto/create-resguardo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OTEstado, PresupuestoEstado } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('sat')
export class SatController {
    constructor(private readonly sat: SatService) { }

    // ── Ordenes de Trabajo ───────────────────────────────────────────────────

    @Post('ordenes')
    createOrden(@Body() dto: CreateOrdenTrabajoDto) {
        return this.sat.createOrdenTrabajo(dto);
    }

    @Get('ordenes')
    findAllOrdenes(
        @Query('estado') estado?: OTEstado,
        @Query('tecnicoId') tecnicoId?: string,
    ) {
        return this.sat.findAllOrdenes({ estado, tecnicoId });
    }

    @Get('ordenes/:id')
    findOrden(@Param('id', ParseUUIDPipe) id: string) {
        return this.sat.findOneOrden(id);
    }

    @Patch('ordenes/:id')
    updateOrden(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateOrdenTrabajoDto,
    ) {
        return this.sat.updateOrdenTrabajo(id, dto);
    }

    @Delete('ordenes/:id')
    deleteOrden(@Param('id', ParseUUIDPipe) id: string) {
        return this.sat.softDeleteOrden(id);
    }

    // ── Presupuestos ─────────────────────────────────────────────────────────

    @Post('presupuestos')
    createPresupuesto(@Body() dto: CreatePresupuestoDto) {
        return this.sat.createPresupuesto(dto);
    }

    @Patch('presupuestos/:id/estado')
    updatePresupuestoEstado(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('estado') estado: PresupuestoEstado,
    ) {
        return this.sat.updatePresupuestoEstado(id, estado);
    }

    // ── Resguardos ────────────────────────────────────────────────────────────

    @Post('resguardos')
    createResguardo(@Body() dto: CreateResguardoDto) {
        return this.sat.createResguardo(dto);
    }

    @Patch('resguardos/:id/devolver')
    devolverResguardo(@Param('id', ParseUUIDPipe) id: string) {
        return this.sat.devolverResguardo(id);
    }

    // ── Pagos ─────────────────────────────────────────────────────────────────

    @Post('pagos')
    registrarPago(@Body() dto: CreatePagoDto) {
        return this.sat.registrarPago(dto);
    }

    @Patch('pagos/:id/anular')
    anularPago(@Param('id', ParseUUIDPipe) id: string) {
        return this.sat.anularPago(id);
    }
}
