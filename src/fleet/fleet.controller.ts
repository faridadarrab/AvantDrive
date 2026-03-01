import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { FleetService } from './fleet.service';
import { CreateVehicleDto, UpdateVehicleDto, CreateInspectionDto, CreateGpsLogDto } from './dto';
import { HasPermission } from '../auth/decorators/has-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ScopeType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';

@Controller('fleet')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class FleetController {
    constructor(private readonly fleetService: FleetService) { }

    @Post('vehicles')
    @HasPermission('fleet.vehicles.create', ScopeType.COMPANY)
    createVehicle(@Body() dto: CreateVehicleDto) {
        return this.fleetService.createVehicle(dto);
    }

    @Get('vehicles')
    @HasPermission('fleet.vehicles.read', ScopeType.COMPANY)
    findAllVehicles() {
        return this.fleetService.findAllVehicles();
    }

    @Patch('vehicles/:id')
    @HasPermission('fleet.vehicles.update', ScopeType.COMPANY)
    updateVehicle(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
        return this.fleetService.updateVehicle(id, dto);
    }

    @Patch('vehicles/:id/unblock')
    @HasPermission('fleet.vehicles.unblock', ScopeType.COMPANY)
    unblockVehicle(@Param('id') id: string, @Body('approvalRequestId') approvalRequestId: string, @CurrentUser() user: any) {
        return this.fleetService.unblockVehicle(id, approvalRequestId);
    }

    @Post('inspections')
    @HasPermission('fleet.inspections.create', ScopeType.COMPANY)
    createInspection(
        @Body('vehicleId') vehicleId: string,
        @Body() dto: CreateInspectionDto,
        @CurrentUser() user: any,
    ) {
        return this.fleetService.createInspection(vehicleId, user.id, dto);
    }

    @Get('vehicles/:id/inspections')
    @HasPermission('fleet.inspections.read', ScopeType.COMPANY)
    getInspections(@Param('id') id: string) {
        return this.fleetService.getInspections(id);
    }

    @Post('vehicles/:id/gps')
    @HasPermission('fleet.gps.create', ScopeType.COMPANY)
    addGpsLog(@Param('id') id: string, @Body() dto: CreateGpsLogDto) {
        return this.fleetService.addGpsLog(id, dto);
    }

    @Get('vehicles/:id/gps-history')
    @HasPermission('fleet.gps.read', ScopeType.COMPANY)
    getGpsHistory(@Param('id') id: string, @Query('cursor') cursor?: string) {
        return this.fleetService.getGpsHistory(id, cursor);
    }
}
