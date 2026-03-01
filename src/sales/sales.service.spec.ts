import { describe, it, expect, vi } from 'vitest';
import { SalesService } from './sales.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoiceEstado, QuoteEstado, RoleName } from '@prisma/client';

const makeService = (prismaOverrides: any = {}, roles = [RoleName.VENTAS_TIENDA]) => {
    const prisma: any = {
        customer: {
            create: vi.fn().mockResolvedValue({ id: 'c-1', nombre: 'Test' }),
            findMany: vi.fn().mockResolvedValue([]),
            findFirst: vi.fn().mockResolvedValue({ id: 'c-1', nombre: 'Test', companyScope: 'avantservice' }),
            update: vi.fn().mockResolvedValue({}),
        },
        quote: {
            count: vi.fn().mockResolvedValue(0),
            create: vi.fn().mockResolvedValue({ id: 'q-1', numero: 'COT-2026-000001' }),
            findMany: vi.fn().mockResolvedValue([]),
            findFirst: vi.fn().mockResolvedValue({ id: 'q-1', companyScope: 'avantservice' }),
            update: vi.fn().mockResolvedValue({ id: 'q-1', estado: QuoteEstado.ACEPTADO }),
        },
        deliveryNote: {
            count: vi.fn().mockResolvedValue(0),
            create: vi.fn().mockResolvedValue({ id: 'dn-1', numero: 'ALB-2026-000001' }),
            findMany: vi.fn().mockResolvedValue([]),
            findFirst: vi.fn().mockResolvedValue({ id: 'dn-1', companyScope: 'avantservice' }),
            update: vi.fn().mockResolvedValue({}),
        },
        invoice: {
            count: vi.fn().mockResolvedValue(0),
            create: vi.fn().mockResolvedValue({ id: 'inv-1', numero: 'FAC-2026-000001', estado: InvoiceEstado.EMITIDA }),
            findMany: vi.fn().mockResolvedValue([]),
            findFirst: vi.fn().mockResolvedValue({ id: 'inv-1', estado: InvoiceEstado.EMITIDA, companyScope: 'avantservice' }),
            update: vi.fn().mockResolvedValue({ id: 'inv-1', estado: InvoiceEstado.ANULADA }),
        },
        approvalRequest: {
            findFirst: vi.fn().mockResolvedValue(null),
        },
        ...prismaOverrides,
    };

    const cls: any = {
        get: vi.fn().mockReturnValue({ id: 'user-1', roles, companyScope: 'avantservice' }),
    };

    return new SalesService(prisma, cls);
};

describe('SalesService', () => {
    // ── Full flow: Quote → accept → DeliveryNote → Invoice → pay ──
    describe('Full sales flow', () => {
        it('creates a quote', async () => {
            const svc = makeService();
            const result = await svc.createQuote({
                customerId: 'c-1', items: [{ concepto: 'Test', cantidad: 1, precio: 100 }],
                subtotal: 100, total: 121,
            });
            expect(result.numero).toBe('COT-2026-000001');
        });

        it('accepts a quote', async () => {
            const svc = makeService();
            const result = await svc.acceptQuote('q-1');
            expect(result.estado).toBe(QuoteEstado.ACEPTADO);
        });

        it('creates a delivery note', async () => {
            const svc = makeService();
            const result = await svc.createDeliveryNote({
                customerId: 'c-1', items: [], total: 121,
            });
            expect(result.numero).toBe('ALB-2026-000001');
        });

        it('creates an invoice', async () => {
            const svc = makeService();
            const result = await svc.createInvoice({
                customerId: 'c-1', items: [], subtotal: 100, total: 121,
            });
            expect(result.numero).toBe('FAC-2026-000001');
        });
    });

    // ── R8a: Invoice void requires approved ApprovalRequest ──
    describe('R8a: Invoice void requires ApprovalRequest', () => {
        it('throws BadRequestException when no approval exists', async () => {
            const svc = makeService();
            await expect(
                svc.voidInvoice('inv-1', { approvalRequestId: 'fake-approval' }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('throws when approval is PENDIENTE (not APROBADA)', async () => {
            const svc = makeService({
                approvalRequest: {
                    findFirst: vi.fn().mockResolvedValue({ id: 'a-1', estado: 'PENDIENTE', companyScope: 'avantservice' }),
                },
            });
            await expect(
                svc.voidInvoice('inv-1', { approvalRequestId: 'a-1' }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('succeeds when approval is APROBADA', async () => {
            const svc = makeService({
                approvalRequest: {
                    findFirst: vi.fn().mockResolvedValue({ id: 'a-1', estado: 'APROBADA', companyScope: 'avantservice' }),
                },
            });
            const result = await svc.voidInvoice('inv-1', { approvalRequestId: 'a-1' });
            expect(result.estado).toBe(InvoiceEstado.ANULADA);
        });
    });
});
