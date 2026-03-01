import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClsService } from 'nestjs-cls';
import {
    OTEstado,
    OTTipo,
    PresupuestoEstado,
    PagoEstado,
    RoleName,
} from '@prisma/client';
import { CreateOrdenTrabajoDto } from './dto/create-orden-trabajo.dto';
import { UpdateOrdenTrabajoDto } from './dto/update-orden-trabajo.dto';
import { CreatePresupuestoDto } from './dto/create-presupuesto.dto';
import { CreatePagoDto } from './dto/create-pago.dto';
import { CreateResguardoDto } from './dto/create-resguardo.dto';

/** Maximum discount (%) a non-admin user can apply to a presupuesto (R-SAT1) */
const MAX_DISCOUNT_NO_ADMIN = 15;

/** States that are considered terminal — no further transitions allowed */
const TERMINAL_STATES: OTEstado[] = [
    OTEstado.ENTREGADA,
    OTEstado.CERRADA,
    OTEstado.CANCELADA,
];

/** Legal state transitions for OrdenTrabajo */
const VALID_TRANSITIONS: Record<OTEstado, OTEstado[]> = {
    [OTEstado.RECIBIDA]: [OTEstado.DIAGNOSTICO, OTEstado.CANCELADA],
    [OTEstado.DIAGNOSTICO]: [OTEstado.ESPERANDO_PIEZAS, OTEstado.EN_REPARACION, OTEstado.CANCELADA],
    [OTEstado.ESPERANDO_PIEZAS]: [OTEstado.EN_REPARACION, OTEstado.CANCELADA],
    [OTEstado.EN_REPARACION]: [OTEstado.CONTROL_CALIDAD, OTEstado.LISTA_ENTREGA],
    [OTEstado.CONTROL_CALIDAD]: [OTEstado.LISTA_ENTREGA, OTEstado.EN_REPARACION],
    [OTEstado.LISTA_ENTREGA]: [OTEstado.ENTREGADA],
    [OTEstado.ENTREGADA]: [OTEstado.CERRADA],
    [OTEstado.CERRADA]: [],
    [OTEstado.CANCELADA]: [],
};

@Injectable()
export class SatService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cls: ClsService,
    ) { }

    // ─── helpers ──────────────────────────────────────────────────────────────

    private currentUser(): { id: string; roles: RoleName[]; companyScope: string } {
        return this.cls.get('user');
    }

    private isAdmin(): boolean {
        return this.currentUser().roles.includes(RoleName.ADMINISTRADOR);
    }

    // ─── OrdenTrabajo ─────────────────────────────────────────────────────────

    async createOrdenTrabajo(dto: CreateOrdenTrabajoDto) {
        const user = this.currentUser();

        // Generate OT number via DocumentSeries (simplified inline — full impl uses DocSeriesService)
        const count = await this.prisma.ordenTrabajo.count({ where: { companyScope: user.companyScope } });
        const numero = `OT-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

        return this.prisma.ordenTrabajo.create({
            data: {
                numero,
                tipo: dto.tipo,
                prioridad: dto.prioridad,
                clienteNombre: dto.clienteNombre,
                clienteTelefono: dto.clienteTelefono,
                clienteEmail: dto.clienteEmail,
                equipoDescripcion: dto.equipoDescripcion,
                equipoMarca: dto.equipoMarca,
                equipoModelo: dto.equipoModelo,
                equipoNumSerie: dto.equipoNumSerie,
                fallaReportada: dto.fallaReportada,
                tecnicoId: dto.tecnicoId,
                fechaCompromiso: dto.fechaCompromiso ? new Date(dto.fechaCompromiso) : undefined,
                observaciones: dto.observaciones,
                receptorId: user.id,
                companyScope: user.companyScope,
            },
            include: { presupuestos: true, resguardos: true, pagos: true },
        });
    }

    async findAllOrdenes(filters?: { estado?: OTEstado; tecnicoId?: string }) {
        const user = this.currentUser();
        return this.prisma.ordenTrabajo.findMany({
            where: {
                companyScope: user.companyScope,
                deletedAt: null,
                ...(filters?.estado ? { estado: filters.estado } : {}),
                ...(filters?.tecnicoId ? { tecnicoId: filters.tecnicoId } : {}),
            },
            orderBy: { createdAt: 'desc' },
            include: { presupuestos: { include: { lineas: true } }, resguardos: true, pagos: true },
        });
    }

    async findOneOrden(id: string) {
        const user = this.currentUser();
        const ot = await this.prisma.ordenTrabajo.findFirst({
            where: { id, companyScope: user.companyScope, deletedAt: null },
            include: { presupuestos: { include: { lineas: true } }, resguardos: true, pagos: true },
        });
        if (!ot) throw new NotFoundException(`OrdenTrabajo ${id} no encontrada`);
        return ot;
    }

    async updateOrdenTrabajo(id: string, dto: UpdateOrdenTrabajoDto) {
        const ot = await this.findOneOrden(id);

        // ── R-SAT5: block transitions from terminal states ────────────────────────
        if (TERMINAL_STATES.includes(ot.estado)) {
            throw new BadRequestException(
                `La OT ${ot.numero} está en estado terminal (${ot.estado}) y no puede modificarse`,
            );
        }

        // ── R-SAT6: validate state machine transition ────────────────────────────
        if (dto.estado && dto.estado !== ot.estado) {
            const allowed = VALID_TRANSITIONS[ot.estado];
            if (!allowed.includes(dto.estado)) {
                throw new BadRequestException(
                    `Transición inválida: ${ot.estado} → ${dto.estado}. Permitidas: ${allowed.join(', ') || 'ninguna'}`,
                );
            }
        }

        // ── R-SAT2: delivery requires customer counter-signature ─────────────────
        if (dto.estado === OTEstado.ENTREGADA && !dto.contrafirmaCliente) {
            throw new BadRequestException(
                'No se puede marcar como ENTREGADA sin la contrafirma del cliente (R-SAT2)',
            );
        }

        // ── R-SAT4: all resguardos must be returned before delivery ─────────────
        if (dto.estado === OTEstado.ENTREGADA) {
            const pending = await this.prisma.resguardoPieza.count({
                where: { ordenTrabajoId: id, devuelta: false },
            });
            if (pending > 0) {
                throw new BadRequestException(
                    `Hay ${pending} resguardo(s) de piezas sin devolver. Confírmelos antes de entregar la OT (R-SAT4)`,
                );
            }
        }

        // ── R-SAT3: closing without accepted quote requires supervisor ───────────
        if (dto.estado === OTEstado.CERRADA) {
            const hasAccepted = await this.prisma.presupuesto.count({
                where: { ordenTrabajoId: id, estado: PresupuestoEstado.ACEPTADO },
            });
            if (hasAccepted === 0 && !this.isAdmin()) {
                throw new ForbiddenException(
                    'No se puede cerrar una OT sin presupuesto aceptado. Requiere ADMINISTRADOR (R-SAT3)',
                );
            }
        }

        return this.prisma.ordenTrabajo.update({
            where: { id },
            data: {
                ...(dto.estado ? { estado: dto.estado } : {}),
                ...(dto.diagnostico ? { diagnostico: dto.diagnostico } : {}),
                ...(dto.tecnicoId ? { tecnicoId: dto.tecnicoId } : {}),
                ...(dto.fechaCompromiso ? { fechaCompromiso: new Date(dto.fechaCompromiso) } : {}),
                ...(dto.fechaEntregaReal ? { fechaEntregaReal: new Date(dto.fechaEntregaReal) } : {}),
                ...(dto.observaciones ? { observaciones: dto.observaciones } : {}),
                ...(dto.contrafirmaCliente !== undefined ? {
                    contrafirmaCliente: dto.contrafirmaCliente,
                    contrafirmaFechaHora: dto.contrafirmaCliente ? new Date() : null,
                } : {}),
            },
            include: { presupuestos: { include: { lineas: true } }, resguardos: true, pagos: true },
        });
    }

    async softDeleteOrden(id: string) {
        await this.findOneOrden(id);
        return this.prisma.ordenTrabajo.update({
            where: { id },
            data: { deletedAt: new Date(), estado: OTEstado.CANCELADA },
        });
    }

    // ─── Presupuesto ─────────────────────────────────────────────────────────

    async createPresupuesto(dto: CreatePresupuestoDto) {
        const user = this.currentUser();
        await this.findOneOrden(dto.ordenTrabajoId); // ownership check

        // ── R-SAT1: discount > 15 % requires ADMINISTRADOR ───────────────────────
        const discount = dto.descuentoPct ?? 0;
        const requiresAdmin = discount > MAX_DISCOUNT_NO_ADMIN;
        if (requiresAdmin && !this.isAdmin()) {
            throw new ForbiddenException(
                `Un descuento del ${discount}% supera el límite del ${MAX_DISCOUNT_NO_ADMIN}%. Requiere ADMINISTRADOR (R-SAT1)`,
            );
        }

        const count = await this.prisma.presupuesto.count({ where: { companyScope: user.companyScope } });
        const numero = `PRE-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

        return this.prisma.presupuesto.create({
            data: {
                numero,
                ordenTrabajoId: dto.ordenTrabajoId,
                descuentoPct: discount,
                pagoSuperadminRequerido: requiresAdmin,
                validoHasta: dto.validoHasta ? new Date(dto.validoHasta) : undefined,
                notasInternas: dto.notasInternas,
                notasCliente: dto.notasCliente,
                creadoPorId: user.id,
                companyScope: user.companyScope,
                lineas: { create: dto.lineas },
            },
            include: { lineas: true },
        });
    }

    async updatePresupuestoEstado(id: string, estado: PresupuestoEstado) {
        const user = this.currentUser();
        const pre = await this.prisma.presupuesto.findFirst({
            where: { id, companyScope: user.companyScope },
        });
        if (!pre) throw new NotFoundException(`Presupuesto ${id} no encontrado`);

        return this.prisma.presupuesto.update({ where: { id }, data: { estado } });
    }

    // ─── ResguardoPieza ───────────────────────────────────────────────────────

    async createResguardo(dto: CreateResguardoDto) {
        const user = this.currentUser();
        await this.findOneOrden(dto.ordenTrabajoId);
        return this.prisma.resguardoPieza.create({
            data: {
                ordenTrabajoId: dto.ordenTrabajoId,
                descripcion: dto.descripcion,
                cantidad: dto.cantidad ?? 1,
                valorDeclarado: dto.valorDeclarado,
                companyScope: user.companyScope,
            },
        });
    }

    async devolverResguardo(id: string) {
        const user = this.currentUser();
        const r = await this.prisma.resguardoPieza.findFirst({
            where: { id, companyScope: user.companyScope },
        });
        if (!r) throw new NotFoundException(`Resguardo ${id} no encontrado`);
        if (r.devuelta) throw new BadRequestException('Este resguardo ya fue devuelto');

        return this.prisma.resguardoPieza.update({
            where: { id },
            data: { devuelta: true, fechaDevolucion: new Date() },
        });
    }

    // ─── Pago ─────────────────────────────────────────────────────────────────

    async registrarPago(dto: CreatePagoDto) {
        const user = this.currentUser();
        await this.findOneOrden(dto.ordenTrabajoId);

        return this.prisma.pago.create({
            data: {
                ordenTrabajoId: dto.ordenTrabajoId,
                metodo: dto.metodo,
                importe: dto.importe,
                referencia: dto.referencia,
                notas: dto.notas,
                registradoPorId: user.id,
                companyScope: user.companyScope,
            },
        });
    }

    /** R-SAT1: annul a payment — only ADMINISTRADOR */
    async anularPago(id: string) {
        if (!this.isAdmin()) {
            throw new ForbiddenException('Solo ADMINISTRADOR puede anular pagos (R-SAT1)');
        }
        const user = this.currentUser();
        const pago = await this.prisma.pago.findFirst({
            where: { id, companyScope: user.companyScope },
        });
        if (!pago) throw new NotFoundException(`Pago ${id} no encontrado`);
        if (pago.estado === PagoEstado.ANULADO) {
            throw new BadRequestException('El pago ya está anulado');
        }

        return this.prisma.pago.update({
            where: { id },
            data: {
                estado: PagoEstado.ANULADO,
                anulacionAprobadaPorId: user.id,
            },
        });
    }
}
