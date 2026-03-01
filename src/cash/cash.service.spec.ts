import { describe, it, expect, vi } from 'vitest';
import { CashService } from './cash.service';
import { BadRequestException } from '@nestjs/common';
import { CashSessionEstado, RoleName } from '@prisma/client';

const makeSession = (overrides = {}) => ({
    id: 's-1', numero: 'CAJA-2026-000001',
    estado: CashSessionEstado.ABIERTA,
    saldoInicial: 100, saldoFinal: null,
    aperturaById: 'user-1',
    companyScope: 'avantservice',
    movements: [
        { tipo: 'INGRESO', importe: 50 },
        { tipo: 'GASTO', importe: 20 },
    ],
    ...overrides,
});

const makeService = (prismaOverrides: any = {}) => {
    const prisma: any = {
        cashSession: {
            count: vi.fn().mockResolvedValue(0),
            create: vi.fn().mockResolvedValue({ id: 's-1', numero: 'CAJA-2026-000001' }),
            findMany: vi.fn().mockResolvedValue([]),
            findFirst: vi.fn().mockResolvedValue(makeSession()),
            update: vi.fn().mockResolvedValue({ ...makeSession(), estado: CashSessionEstado.CERRADA }),
        },
        cashMovement: {
            create: vi.fn().mockResolvedValue({ id: 'cm-1' }),
            findMany: vi.fn().mockResolvedValue([]),
        },
        approvalRequest: {
            findFirst: vi.fn().mockResolvedValue(null),
        },
        ...prismaOverrides,
    };

    const cls: any = {
        get: vi.fn().mockReturnValue({
            id: 'user-1',
            roles: [RoleName.VENTAS_TIENDA],
            companyScope: 'avantservice',
        }),
    };

    return new CashService(prisma, cls);
};

describe('CashService', () => {
    describe('Session close — expected balance matches', () => {
        it('closes session when saldoFinal matches expected', async () => {
            // expected = 100 + 50 - 20 = 130
            const svc = makeService();
            const result = await svc.closeSession('s-1', { saldoFinal: 130 });
            expect(result.estado).toBe(CashSessionEstado.CERRADA);
        });
    });

    describe('R8b: Cash reset requires approval', () => {
        it('throws when saldoFinal differs and no approval', async () => {
            const svc = makeService();
            // expected 130, sending 200 → diff = 70
            await expect(
                svc.closeSession('s-1', { saldoFinal: 200 }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('throws when approval exists but not APROBADA', async () => {
            const svc = makeService({
                approvalRequest: {
                    findFirst: vi.fn().mockResolvedValue({ id: 'ar-1', estado: 'PENDIENTE', companyScope: 'avantservice' }),
                },
            });
            await expect(
                svc.closeSession('s-1', { saldoFinal: 200, approvalRequestId: 'ar-1' }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('succeeds when approval is APROBADA', async () => {
            const svc = makeService({
                approvalRequest: {
                    findFirst: vi.fn().mockResolvedValue({ id: 'ar-1', estado: 'APROBADA', companyScope: 'avantservice' }),
                },
            });
            const result = await svc.closeSession('s-1', { saldoFinal: 200, approvalRequestId: 'ar-1' });
            expect(result.estado).toBe(CashSessionEstado.CERRADA);
        });
    });

    describe('Summary', () => {
        it('calculates session summary correctly', async () => {
            const svc = makeService();
            const summary = await svc.getSessionSummary('s-1');
            expect(summary.saldoInicial).toBe(100);
            expect(summary.totalIngresos).toBe(50);
            expect(summary.totalGastos).toBe(20);
            expect(summary.saldoCalculado).toBe(130);
        });
    });
});
