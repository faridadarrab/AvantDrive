import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateToolDto, UpdateToolDto, MoveToolDto } from './dto';
import { ToolEstado, ToolMovementTipo } from '@prisma/client';
import { JwtPayload } from '@/auth/interfaces';

@Injectable()
export class ToolsService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(companyScope: string) {
        return this.prisma.tool.findMany({
            where: { companyScope, deletedAt: null },
            include: { location: true },
        });
    }

    async findOne(id: string, companyScope: string) {
        const tool = await this.prisma.tool.findFirst({
            where: { id, companyScope, deletedAt: null },
            include: { location: true, movements: { take: 10, orderBy: { fecha: 'desc' } } },
        });
        if (!tool) throw new NotFoundException('Herramienta no encontrada');
        return tool;
    }

    async create(dto: CreateToolDto, companyScope: string) {
        return this.prisma.tool.create({
            data: {
                nombre: dto.nombre,
                categoria: dto.categoria,
                qrCode: dto.qrCode,
                estado: dto.estado ?? ToolEstado.DISPONIBLE,
                locationId: dto.locationId,
                precioCompra: dto.precioCompra,
                valorActual: dto.valorActual,
                proveedor: dto.proveedor,
                proximoMantenimiento: dto.proximoMantenimiento
                    ? new Date(dto.proximoMantenimiento)
                    : undefined,
                numeroSerie: dto.numeroSerie,
                companyScope,
            },
        });
    }

    /**
     * R4: No DELETE. Only soft-delete via deletedAt or field updates.
     */
    async update(id: string, dto: UpdateToolDto, companyScope: string) {
        const tool = await this.prisma.tool.findFirst({
            where: { id, companyScope, deletedAt: null },
        });
        if (!tool) throw new NotFoundException('Herramienta no encontrada');

        return this.prisma.tool.update({
            where: { id },
            data: {
                nombre: dto.nombre,
                categoria: dto.categoria,
                estado: dto.estado,
                locationId: dto.locationId,
                precioCompra: dto.precioCompra,
                valorActual: dto.valorActual,
                proveedor: dto.proveedor,
                proximoMantenimiento: dto.proximoMantenimiento
                    ? new Date(dto.proximoMantenimiento)
                    : undefined,
                numeroSerie: dto.numeroSerie,
                deletedAt: dto.deletedAt ? new Date(dto.deletedAt) : undefined,
            },
        });
    }

    /**
     * QR scan: returns tool data + available actions based on JWT roles.
     */
    async scanQr(qrCode: string, companyScope: string, user: JwtPayload) {
        const tool = await this.prisma.tool.findFirst({
            where: { qrCode, companyScope, deletedAt: null },
            include: { location: true },
        });
        if (!tool) throw new NotFoundException('Herramienta no encontrada para QR');

        const actions: string[] = [];
        const isAdmin = user.roles.includes('ADMINISTRADOR');
        const isGestor = user.roles.includes('GESTOR_ALMACEN_PIEZAS');

        if (isAdmin || isGestor) {
            actions.push('MOVER', 'TRASLADAR', 'DAR_BAJA');
        }
        if (tool.estado === ToolEstado.DISPONIBLE) {
            actions.push('RETIRAR');
        }
        if (tool.estado === ToolEstado.ASIGNADA) {
            actions.push('DEVOLVER');
        }
        actions.push('VER_HISTORIAL', 'REPORTAR_INCIDENCIA');

        return { tool, actions };
    }

    /**
     * Move a tool. RBAC enforced at controller level (ADMIN + GESTOR_ALMACEN only).
     */
    async moveTool(dto: MoveToolDto, userId: string, companyScope: string) {
        const tool = await this.prisma.tool.findFirst({
            where: { id: dto.toolId, companyScope, deletedAt: null },
        });
        if (!tool) throw new NotFoundException('Herramienta no encontrada');

        // Determine new tool estado based on movement type
        let newEstado: ToolEstado = tool.estado;
        if (dto.tipo === ToolMovementTipo.RETIRADA) {
            newEstado = ToolEstado.ASIGNADA;
        } else if (dto.tipo === ToolMovementTipo.DEVOLUCION) {
            newEstado = ToolEstado.DISPONIBLE;
        } else if (dto.tipo === ToolMovementTipo.BAJA) {
            newEstado = ToolEstado.BAJA;
        }

        const [movement] = await this.prisma.$transaction([
            this.prisma.toolMovement.create({
                data: {
                    toolId: dto.toolId,
                    tipo: dto.tipo,
                    locationOrigenId: dto.locationOrigenId ?? tool.locationId,
                    locationDestinoId: dto.locationDestinoId,
                    userId,
                    workOrderId: dto.workOrderId,
                    solicitudId: dto.solicitudId,
                    companyScope,
                },
            }),
            this.prisma.tool.update({
                where: { id: dto.toolId },
                data: {
                    estado: newEstado,
                    locationId: dto.locationDestinoId ?? tool.locationId,
                },
            }),
        ]);

        return movement;
    }

    /**
     * Checkout entire kit — bulk move all tools in a kit.
     */
    async checkoutKit(
        kitId: string,
        locationDestinoId: string,
        userId: string,
        companyScope: string,
    ) {
        const kit = await this.prisma.toolKit.findFirst({
            where: { id: kitId, companyScope, activo: true },
            include: { items: { include: { tool: true } } },
        });
        if (!kit) throw new NotFoundException('Kit no encontrado');

        const movements = [];
        for (const item of kit.items) {
            if (item.tool.estado !== ToolEstado.DISPONIBLE || item.tool.deletedAt) {
                throw new BadRequestException(
                    `Herramienta "${item.tool.nombre}" no está disponible para retiro`,
                );
            }
            movements.push(
                this.prisma.toolMovement.create({
                    data: {
                        toolId: item.toolId,
                        tipo: ToolMovementTipo.RETIRADA,
                        locationOrigenId: item.tool.locationId,
                        locationDestinoId,
                        userId,
                        companyScope,
                    },
                }),
                this.prisma.tool.update({
                    where: { id: item.toolId },
                    data: {
                        estado: ToolEstado.ASIGNADA,
                        locationId: locationDestinoId,
                    },
                }),
            );
        }

        await this.prisma.$transaction(movements);
        return { message: `Kit "${kit.nombre}" retirado (${kit.items.length} herramientas)` };
    }

    /**
     * Tools with overdue maintenance (for alerts).
     */
    async findOverdueMaintenance(companyScope: string) {
        return this.prisma.tool.findMany({
            where: {
                companyScope,
                deletedAt: null,
                proximoMantenimiento: { lt: new Date() },
                estado: { not: ToolEstado.BAJA },
            },
            include: { location: true },
        });
    }
}
