import {
    Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClsService } from 'nestjs-cls';
import { CashSessionEstado, RoleName } from '@prisma/client';
import { OpenCashSessionDto, CloseCashSessionDto, CreateCashMovementDto } from './dto/cash.dto';

@Injectable()
export class CashService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cls: ClsService,
    ) { }

    private currentUser() {
        return this.cls.get('user') as { id: string; roles: RoleName[]; companyScope: string };
    }

    private isAdminOrAdmon(): boolean {
        const roles = this.currentUser().roles;
        return roles.includes(RoleName.ADMINISTRADOR) || roles.includes(RoleName.ADMINISTRACION);
    }

    // ─── Sessions ─────────────────────────────────────────────────────────────

    async openSession(dto: OpenCashSessionDto) {
        const user = this.currentUser();
        const count = await this.prisma.cashSession.count({ where: { companyScope: user.companyScope } });
        const numero = `CAJA-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

        return this.prisma.cashSession.create({
            data: {
                numero,
                aperturaById: user.id,
                saldoInicial: dto.saldoInicial,
                companyScope: user.companyScope,
            },
        });
    }

    async findAllSessions() {
        const user = this.currentUser();
        return this.prisma.cashSession.findMany({
            where: { companyScope: user.companyScope },
            orderBy: { createdAt: 'desc' },
            include: { movements: true },
        });
    }

    /** R8b: Closing a session with saldoFinal reset requires approved ApprovalRequest */
    async closeSession(id: string, dto: CloseCashSessionDto) {
        const user = this.currentUser();
        const session = await this.prisma.cashSession.findFirst({
            where: { id, companyScope: user.companyScope },
            include: { movements: true },
        });
        if (!session) throw new NotFoundException(`CashSession ${id} no encontrada`);
        if (session.estado === CashSessionEstado.CERRADA) {
            throw new BadRequestException('La sesión ya está cerrada');
        }

        // Calculate expected balance
        const expectedBalance = session.movements.reduce((sum, m) => {
            if (m.tipo === 'INGRESO' || m.tipo === 'COBRO_FACTURA') return sum + m.importe;
            if (m.tipo === 'GASTO' || m.tipo === 'DEVOLUCION') return sum - m.importe;
            return sum;
        }, session.saldoInicial);

        // R8b: if saldoFinal differs significantly from expected (reset), require approval
        const difference = Math.abs(dto.saldoFinal - expectedBalance);
        if (difference > 0.01) {
            if (!dto.approvalRequestId) {
                throw new BadRequestException(
                    `R8b: Saldo final (${dto.saldoFinal}) difiere del esperado (${expectedBalance.toFixed(2)}). Requiere ApprovalRequest APROBADA.`
                );
            }
            const approval = await this.prisma.approvalRequest.findFirst({
                where: { id: dto.approvalRequestId, companyScope: user.companyScope },
            });
            if (!approval || approval.estado !== 'APROBADA') {
                throw new BadRequestException('R8b: ApprovalRequest debe estar APROBADA para resetear saldo');
            }
        }

        return this.prisma.cashSession.update({
            where: { id },
            data: { estado: CashSessionEstado.CERRADA, saldoFinal: dto.saldoFinal, cierreById: user.id },
        });
    }

    // ─── Movements ────────────────────────────────────────────────────────────

    async createMovement(dto: CreateCashMovementDto) {
        const user = this.currentUser();
        const session = await this.prisma.cashSession.findFirst({
            where: { id: dto.sessionId, companyScope: user.companyScope },
        });
        if (!session) throw new NotFoundException(`CashSession ${dto.sessionId} no encontrada`);
        if (session.estado === CashSessionEstado.CERRADA) {
            throw new BadRequestException('No se puede añadir movimientos a una sesión cerrada');
        }

        return this.prisma.cashMovement.create({
            data: {
                sessionId: dto.sessionId,
                tipo: dto.tipo,
                concepto: dto.concepto,
                importe: dto.importe,
                invoiceId: dto.invoiceId,
                userId: user.id,
                companyScope: user.companyScope,
            },
        });
    }

    async findMovementsBySession(sessionId: string) {
        const user = this.currentUser();
        return this.prisma.cashMovement.findMany({
            where: { sessionId, companyScope: user.companyScope },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getSessionSummary(id: string) {
        const user = this.currentUser();
        const session = await this.prisma.cashSession.findFirst({
            where: { id, companyScope: user.companyScope },
            include: { movements: true },
        });
        if (!session) throw new NotFoundException(`CashSession ${id} no encontrada`);

        const ingresos = session.movements
            .filter(m => m.tipo === 'INGRESO' || m.tipo === 'COBRO_FACTURA')
            .reduce((s, m) => s + m.importe, 0);
        const gastos = session.movements
            .filter(m => m.tipo === 'GASTO' || m.tipo === 'DEVOLUCION')
            .reduce((s, m) => s + m.importe, 0);

        return {
            sessionId: id,
            numero: session.numero,
            estado: session.estado,
            saldoInicial: session.saldoInicial,
            totalIngresos: ingresos,
            totalGastos: gastos,
            saldoCalculado: session.saldoInicial + ingresos - gastos,
            saldoFinal: session.saldoFinal,
            totalMovimientos: session.movements.length,
        };
    }
}
