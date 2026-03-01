import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ToolsService } from './tools.service';
import { CreateToolDto, UpdateToolDto, MoveToolDto } from './dto';
import { HasPermission } from '@/auth/decorators/has-permission.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { JwtPayload } from '@/auth/interfaces';

@Controller('tools')
export class ToolsController {
    constructor(private readonly toolsService: ToolsService) { }

    @Get()
    @HasPermission('tools.read', 'COMPANY')
    findAll(@CurrentUser() user: JwtPayload) {
        return this.toolsService.findAll(user.companyScope);
    }

    @Post()
    @HasPermission('tools.create', 'COMPANY')
    create(@Body() dto: CreateToolDto, @CurrentUser() user: JwtPayload) {
        return this.toolsService.create(dto, user.companyScope);
    }

    @Get(':id')
    @HasPermission('tools.read', 'COMPANY')
    findOne(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: JwtPayload,
    ) {
        return this.toolsService.findOne(id, user.companyScope);
    }

    @Patch(':id')
    @HasPermission('tools.update', 'COMPANY')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateToolDto,
        @CurrentUser() user: JwtPayload,
    ) {
        return this.toolsService.update(id, dto, user.companyScope);
    }

    /**
     * QR scan — returns tool data + available actions based on JWT roles.
     */
    @Post('scan-qr/:qrCode')
    @HasPermission('tools.read', 'COMPANY')
    scanQr(
        @Param('qrCode') qrCode: string,
        @CurrentUser() user: JwtPayload,
    ) {
        return this.toolsService.scanQr(qrCode, user.companyScope, user);
    }

    /**
     * Checkout entire kit as a batch.
     */
    @Post('kits/:id/checkout')
    @HasPermission('tools.move', 'COMPANY')
    checkoutKit(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('locationDestinoId') locationDestinoId: string,
        @CurrentUser() user: JwtPayload,
    ) {
        return this.toolsService.checkoutKit(id, locationDestinoId, user.sub, user.companyScope);
    }

    /**
     * Move a tool between locations.
     * RBAC: Only ADMIN and GESTOR_ALMACEN_PIEZAS (enforced via 'tools.move' permission).
     * REPARADOR_* roles receive 403.
     */
    @Post('move')
    @HasPermission('tools.move', 'COMPANY')
    moveTool(@Body() dto: MoveToolDto, @CurrentUser() user: JwtPayload) {
        return this.toolsService.moveTool(dto, user.sub, user.companyScope);
    }
}
