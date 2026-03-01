import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { CreateMaterialDto, UpdateMaterialDto, MoveMaterialDto } from './dto';
import { HasPermission } from '../auth/decorators/has-permission.decorator';
import { ScopeType } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Materials')
@ApiBearerAuth()
@Controller('materials')
export class MaterialsController {
    constructor(private readonly materialsService: MaterialsService) { }

    @Post()
    @HasPermission('materials.manage', ScopeType.COMPANY)
    @ApiOperation({ summary: 'Create a new material' })
    create(@Body() createMaterialDto: CreateMaterialDto) {
        return this.materialsService.createMaterial(createMaterialDto);
    }

    @Get()
    @HasPermission('materials.manage', ScopeType.COMPANY)
    @ApiOperation({ summary: 'List all materials' })
    findAll() {
        return this.materialsService.findAll();
    }

    @Get(':id')
    @HasPermission('materials.manage', ScopeType.COMPANY)
    @ApiOperation({ summary: 'Get material by id' })
    findOne(@Param('id') id: string) {
        return this.materialsService.findOne(id);
    }

    @Patch(':id')
    @HasPermission('materials.manage', ScopeType.COMPANY)
    @ApiOperation({ summary: 'Update material by id' })
    update(@Param('id') id: string, @Body() updateMaterialDto: UpdateMaterialDto) {
        return this.materialsService.updateMaterial(id, updateMaterialDto);
    }

    @Delete(':id/soft-delete/:approvalId')
    @HasPermission('materials.manage', ScopeType.COMPANY)
    @ApiOperation({ summary: 'Soft delete material requires ApprovalRequest APROBADA' })
    remove(@Param('id') id: string, @Param('approvalId') approvalId: string) {
        return this.materialsService.softDeleteMaterial(id, approvalId);
    }

    @Post('move')
    @HasPermission('materials.move', ScopeType.COMPANY)
    @ApiOperation({ summary: 'Execute a material movement (ENTRADA, SALIDA, AJUSTE, etc)' })
    moveMaterial(@Body() dto: MoveMaterialDto) {
        return this.materialsService.moveMaterial(dto);
    }
}
