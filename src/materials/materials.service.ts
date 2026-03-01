import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClsService } from 'nestjs-cls';
import { CreateMaterialDto, UpdateMaterialDto, MoveMaterialDto } from './dto';
import { MaterialMovementTipo, RoleName } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class MaterialsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cls: ClsService,
    ) { }

    private get companyScope() {
        return this.cls.get('company_scope');
    }

    private getCurrentUserId() {
        return this.cls.get('user')?.id;
    }

    async createMaterial(dto: CreateMaterialDto) {
        return this.prisma.material.create({
            data: {
                ...dto,
                qrCode: dto.codigoRef || randomUUID(),
                companyScope: this.companyScope,
            },
        });
    }

    async findAll() {
        return this.prisma.material.findMany({
            where: { companyScope: this.companyScope, deletedAt: null },
            include: { location: true },
        });
    }

    async findOne(id: string) {
        const material = await this.prisma.material.findFirst({
            where: { id, companyScope: this.companyScope, deletedAt: null },
            include: { location: true },
        });
        if (!material) throw new HttpException('Material not found', HttpStatus.NOT_FOUND);
        return material;
    }

    async updateMaterial(id: string, dto: UpdateMaterialDto) {
        const material = await this.findOne(id);
        return this.prisma.material.update({
            where: { id: material.id },
            data: dto,
        });
    }

    async softDeleteMaterial(id: string, approvalRequestId: string) {
        const material = await this.findOne(id);

        const approval = await this.prisma.approvalRequest.findFirst({
            where: { id: approvalRequestId, companyScope: this.companyScope },
        });

        if (!approval || approval.estado !== 'APROBADA') {
            throw new HttpException('Requiere ApprovalRequest APROBADA previa', HttpStatus.FORBIDDEN);
        }

        return this.prisma.material.update({
            where: { id: material.id },
            data: { deletedAt: new Date() },
        });
    }

    async moveMaterial(dto: MoveMaterialDto) {
        const material = await this.findOne(dto.materialId);
        const userId = this.getCurrentUserId();

        // Enforce RBAC rules explicitly in service
        const userRoles = await this.prisma.userRole.findMany({
            where: { userId },
            include: { role: true }
        });

        const isReparador = userRoles.some(ur =>
            ur.role.nombre === RoleName.REPARADOR_DOMICILIO ||
            ur.role.nombre === RoleName.REPARADOR_TALLER
        );

        if (isReparador) {
            throw new HttpException('Reparadores cannot move materials directly. Use SolicitudWorkflow.', HttpStatus.FORBIDDEN);
        }

        // Rule R2: SALIDA without work_order_id is forbidden
        if (dto.tipo === MaterialMovementTipo.SALIDA && !dto.workOrderId) {
            throw new HttpException('Rule R2: Consumo material sin work_order_id válido', HttpStatus.BAD_REQUEST);
        }

        // Rule R3: High stock AJUSTE check (example threshold: adjust difference > 10% of stock)
        // Here we just demand an ApprovalRequest on any manual AJUSTE for safety
        if (dto.tipo === MaterialMovementTipo.AJUSTE && !dto.solicitudId) {
            // we use solicitudId or a dedicated field to pass approval requirement
            // Let's create an approval request and reject it with 202
            await this.prisma.approvalRequest.create({
                data: {
                    tipo: 'ajuste_inventario_materiales',
                    creadoPorId: userId,
                    companyScope: this.companyScope,
                    contextJson: dto as any,
                }
            });
            throw new HttpException('Ajuste de inventario requiere ApprovalRequest APROBADA previa', HttpStatus.ACCEPTED);
        }

        if (dto.tipo === MaterialMovementTipo.AJUSTE && dto.solicitudId) {
            const approval = await this.prisma.approvalRequest.findFirst({
                where: { id: dto.solicitudId, companyScope: this.companyScope }
            });
            if (!approval || approval.estado !== 'APROBADA') {
                throw new HttpException('ApprovalRequest pendiente o rechazada', HttpStatus.FORBIDDEN);
            }
        }

        // Apply movement logic inside a transaction
        return this.prisma.$transaction(async (tx) => {
            let newStock = material.stockActual;

            if (dto.tipo === MaterialMovementTipo.ENTRADA || dto.tipo === MaterialMovementTipo.DEVOLUCION) {
                newStock += dto.cantidad;
            } else if (dto.tipo === MaterialMovementTipo.SALIDA) {
                if (material.stockActual < dto.cantidad) throw new HttpException('Insufficient stock', HttpStatus.BAD_REQUEST);
                newStock -= dto.cantidad;
            } else if (dto.tipo === MaterialMovementTipo.AJUSTE) {
                newStock = dto.cantidad; // In this model, we treat AJUSTE quantity as the absolute new stock level
            }

            const updatedMaterial = await tx.material.update({
                where: { id: material.id },
                data: { stockActual: newStock },
            });

            const movement = await tx.materialMovement.create({
                data: {
                    ...dto,
                    userId,
                    companyScope: this.companyScope,
                }
            });

            return { updatedMaterial, movement };
        });
    }
}
