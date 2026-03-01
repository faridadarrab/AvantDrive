import { describe, it, expect, vi } from 'vitest';
import { CrmService } from './crm.service';
import { NotFoundException } from '@nestjs/common';
import { ContactTipo, ContractEstado, InteractionTipo, RoleName } from '@prisma/client';

const makeService = (prismaOverrides: any = {}) => {
    const prisma: any = {
        contact: {
            create: vi.fn().mockResolvedValue({ id: 'ct-1', nombre: 'Juan' }),
            findMany: vi.fn().mockResolvedValue([
                { id: 'ct-1', nombre: 'Juan García', email: 'juan@test.com', empresa: 'TestCo', companyScope: 'avantservice' },
                { id: 'ct-2', nombre: 'María López', email: 'maria@other.com', empresa: 'AcmeCo', companyScope: 'avantservice' },
            ]),
            findFirst: vi.fn().mockResolvedValue({ id: 'ct-1', nombre: 'Juan', companyScope: 'avantservice' }),
            update: vi.fn().mockResolvedValue({}),
            createMany: vi.fn().mockResolvedValue({ count: 3 }),
        },
        interaction: {
            create: vi.fn().mockResolvedValue({ id: 'i-1' }),
            findMany: vi.fn().mockResolvedValue([
                { id: 'i-1', fecha: new Date('2026-03-01'), asunto: 'Llamada', tipo: InteractionTipo.LLAMADA },
                { id: 'i-2', fecha: new Date('2026-02-28'), asunto: 'Email', tipo: InteractionTipo.EMAIL },
                { id: 'i-3', fecha: new Date('2026-02-25'), asunto: 'Reunión', tipo: InteractionTipo.REUNION },
            ]),
        },
        contract: {
            create: vi.fn().mockResolvedValue({ id: 'co-1' }),
            findMany: vi.fn().mockResolvedValue([
                { id: 'co-1', titulo: 'Mantenimiento', fechaFin: new Date(Date.now() + 10 * 86400000), estado: ContractEstado.ACTIVO },
                { id: 'co-2', titulo: 'Soporte', fechaFin: new Date(Date.now() + 25 * 86400000), estado: ContractEstado.ACTIVO },
            ]),
            findFirst: vi.fn().mockResolvedValue({ id: 'co-1', companyScope: 'avantservice' }),
            update: vi.fn().mockResolvedValue({}),
        },
        reminder: {
            create: vi.fn().mockResolvedValue({ id: 'r-1' }),
            findMany: vi.fn().mockResolvedValue([
                { id: 'r-1', titulo: 'Llamar cliente', completado: false },
            ]),
            findFirst: vi.fn().mockResolvedValue({ id: 'r-1', userId: 'user-1' }),
            update: vi.fn().mockResolvedValue({ id: 'r-1', completado: true }),
        },
        tag: {
            create: vi.fn().mockResolvedValue({ id: 't-1', nombre: 'VIP' }),
            findMany: vi.fn().mockResolvedValue([]),
        },
        contactTag: {
            create: vi.fn().mockResolvedValue({}),
        },
        ...prismaOverrides,
    };

    const cls: any = {
        get: vi.fn().mockReturnValue({ id: 'user-1', roles: [RoleName.ATENCION_AL_CLIENTE], companyScope: 'avantservice' }),
    };

    return new CrmService(prisma, cls);
};

describe('CrmService', () => {
    describe('Full-text search', () => {
        it('searches contacts by query (name, email, empresa)', async () => {
            const svc = makeService();
            const results = await svc.findAllContacts('Juan');
            expect(results.length).toBeGreaterThan(0);
            expect(svc['prisma'].contact.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: expect.arrayContaining([
                            { nombre: { contains: 'Juan', mode: 'insensitive' } },
                        ]),
                    }),
                }),
            );
        });

        it('returns all contacts when no query', async () => {
            const svc = makeService();
            const results = await svc.findAllContacts();
            expect(results.length).toBe(2);
        });
    });

    describe('Timeline', () => {
        it('returns interactions ordered by date desc', async () => {
            const svc = makeService();
            const timeline = await svc.getTimeline('ct-1');
            expect(timeline.length).toBe(3);
            // Check order (mock already returns sorted, but we verify the call)
            expect(svc['prisma'].interaction.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ orderBy: { fecha: 'desc' } }),
            );
        });
    });

    describe('Expiring contracts', () => {
        it('finds contracts expiring within 30 days', async () => {
            const svc = makeService();
            const expiring = await svc.findExpiringSoon();
            expect(expiring.length).toBe(2);
            expect(svc['prisma'].contract.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        estado: ContractEstado.ACTIVO,
                        fechaFin: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }),
                    }),
                }),
            );
        });
    });

    describe('Reminders', () => {
        it('finds today reminders for current user', async () => {
            const svc = makeService();
            const reminders = await svc.findTodayReminders();
            expect(svc['prisma'].reminder.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        userId: 'user-1',
                        completado: false,
                    }),
                }),
            );
        });

        it('completes a reminder', async () => {
            const svc = makeService();
            const result = await svc.completeReminder('r-1');
            expect(result.completado).toBe(true);
        });
    });

    describe('CSV import', () => {
        it('imports contacts from CSV', async () => {
            const svc = makeService();
            const csv = 'nombre,email,telefono\nJohn,john@test.com,555111\nJane,jane@test.com,555222\nBob,bob@test.com,555333';
            const result = await svc.importContactsCsv(csv);
            expect(result.imported).toBe(3);
        });
    });
});
