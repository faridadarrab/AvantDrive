import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DocSeriesService } from './doc-series.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('DocSeriesService', () => {
    let service: DocSeriesService;
    let prismaService: any;

    const mockSeries = {
        id: 'series-001',
        empresa: 'AvantService',
        docType: 'OT',
        serieCodigo: 'OT-AVANTSERVICE',
        prefijo: 'OT',
        padding: 6,
        periodo: 'ANUAL',
        activo: true,
        companyScope: 'AvantService',
        createdAt: new Date(),
    };

    beforeEach(async () => {
        prismaService = {
            $transaction: vi.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DocSeriesService,
                { provide: PrismaService, useValue: prismaService },
            ],
        }).compile();

        service = module.get<DocSeriesService>(DocSeriesService);
    });

    it('should generate the first number in a new period', async () => {
        const year = new Date().getFullYear().toString();

        prismaService.$transaction.mockImplementation(async (callback: any) => {
            const tx = {
                documentSeries: {
                    findUnique: vi.fn().mockResolvedValue(mockSeries),
                },
                documentCounter: {
                    create: vi.fn().mockResolvedValue({
                        id: 'counter-1',
                        seriesId: 'series-001',
                        periodoKey: year,
                        siguienteNumero: 2,
                    }),
                },
                $queryRawUnsafe: vi.fn().mockResolvedValue([]), // No existing counter
                $executeRawUnsafe: vi.fn(),
            };
            return callback(tx);
        });

        const result = await service.generateNextNumber('series-001');

        expect(result).toBe(`OT-${year}-000001`);
    });

    it('should generate sequential numbers', async () => {
        const year = new Date().getFullYear().toString();

        prismaService.$transaction.mockImplementation(async (callback: any) => {
            const tx = {
                documentSeries: {
                    findUnique: vi.fn().mockResolvedValue(mockSeries),
                },
                $queryRawUnsafe: vi.fn().mockResolvedValue([
                    { id: 'counter-1', siguiente_numero: 42 }, // existing counter at 42
                ]),
                $executeRawUnsafe: vi.fn(),
            };
            return callback(tx);
        });

        const result = await service.generateNextNumber('series-001');

        expect(result).toBe(`OT-${year}-000042`);
    });

    it('should throw NotFoundException for inactive series', async () => {
        prismaService.$transaction.mockImplementation(async (callback: any) => {
            const tx = {
                documentSeries: {
                    findUnique: vi.fn().mockResolvedValue({
                        ...mockSeries,
                        activo: false,
                    }),
                },
            };
            return callback(tx);
        });

        await expect(
            service.generateNextNumber('series-001'),
        ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent series', async () => {
        prismaService.$transaction.mockImplementation(async (callback: any) => {
            const tx = {
                documentSeries: {
                    findUnique: vi.fn().mockResolvedValue(null),
                },
            };
            return callback(tx);
        });

        await expect(
            service.generateNextNumber('non-existent'),
        ).rejects.toThrow(NotFoundException);
    });

    it('two concurrent calls should produce unique sequential numbers', async () => {
        const year = new Date().getFullYear().toString();
        let currentNumber = 1;

        prismaService.$transaction.mockImplementation(async (callback: any) => {
            const num = currentNumber;
            currentNumber++;

            const tx = {
                documentSeries: {
                    findUnique: vi.fn().mockResolvedValue(mockSeries),
                },
                $queryRawUnsafe: vi.fn().mockResolvedValue([
                    { id: 'counter-1', siguiente_numero: num },
                ]),
                $executeRawUnsafe: vi.fn(),
            };
            return callback(tx);
        });

        // Simulate two concurrent requests
        const [result1, result2] = await Promise.all([
            service.generateNextNumber('series-001'),
            service.generateNextNumber('series-001'),
        ]);

        expect(result1).toBe(`OT-${year}-000001`);
        expect(result2).toBe(`OT-${year}-000002`);
        expect(result1).not.toBe(result2);
    });

    it('should handle NINGUNO periodo without year in format', async () => {
        const seriesNoYear = { ...mockSeries, periodo: 'NINGUNO' };

        prismaService.$transaction.mockImplementation(async (callback: any) => {
            const tx = {
                documentSeries: {
                    findUnique: vi.fn().mockResolvedValue(seriesNoYear),
                },
                documentCounter: {
                    create: vi.fn().mockResolvedValue({
                        id: 'counter-1',
                        seriesId: 'series-001',
                        periodoKey: 'ALL',
                        siguienteNumero: 2,
                    }),
                },
                $queryRawUnsafe: vi.fn().mockResolvedValue([]),
                $executeRawUnsafe: vi.fn(),
            };
            return callback(tx);
        });

        const result = await service.generateNextNumber('series-001');

        expect(result).toBe('OT-000001');
    });
});
