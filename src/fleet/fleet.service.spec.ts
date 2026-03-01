/// <reference types="vitest/globals" />
import { Test, TestingModule } from '@nestjs/testing';
import { FleetService } from './fleet.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClsService } from 'nestjs-cls';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ComponentEstado } from './dto/create-inspection.dto';

vi.mock('@prisma/client', async (importOriginal: () => Promise<any>) => {
    const actual = await importOriginal();
    return {
        ...actual,
        VehicleEstado: { OPERATIVO: 'OPERATIVO', BLOQUEADO_SEGURIDAD: 'BLOQUEADO_SEGURIDAD' },
        ApprovalStatus: { APROBADA: 'APROBADA', PENDIENTE: 'PENDIENTE' }
    };
});

describe('FleetService', () => {
    let service: FleetService;
    let prisma: any;
    let eventEmitter: any;

    beforeEach(async () => {
        prisma = {
            vehicle: {
                findFirst: vi.fn(),
                update: vi.fn().mockResolvedValue({ id: 'veh-1' }),
            },
            approvalRequest: {
                create: vi.fn(),
            },
            vehicleInspection: {
                create: vi.fn().mockResolvedValue({ id: 'insp-1' }),
            },
            vehicleOdometerLog: {
                create: vi.fn().mockResolvedValue({ id: 'log-1' }),
            }
        };
        eventEmitter = {
            emit: vi.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FleetService,
                { provide: PrismaService, useValue: prisma },
                { provide: ClsService, useValue: { get: () => 'COMP1' } },
                { provide: EventEmitter2, useValue: eventEmitter },
            ],
        }).compile();

        service = module.get<FleetService>(FleetService);
    });

    describe('Anti-fraud Rules', () => {
        it('R1: creates approval request and returns 202 if odometro < actual', async () => {
            prisma.vehicle.findFirst.mockResolvedValue({ id: 'veh-1', kmActualValidado: 10000 });

            const dto = {
                odometroKm: 9000,
                estadoGeneral: 'OK',
                items: []
            };

            try {
                await service.createInspection('veh-1', 'user-1', dto);
                expect(true).toBe(false); // Should throw
            } catch (err: any) {
                expect(err).toBeInstanceOf(HttpException);
                expect(err.getStatus()).toBe(HttpStatus.ACCEPTED); // 202
            }

            expect(prisma.approvalRequest.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ tipo: 'correccion_odometro', creadoPorId: 'user-1' })
            }));
            expect(prisma.vehicleInspection.create).not.toHaveBeenCalled();
        });

        it('R5: auto-blocks vehicle if critical item is NOT_OK', async () => {
            prisma.vehicle.findFirst.mockResolvedValue({ id: 'veh-1', kmActualValidado: 10000, estado: 'OPERATIVO' });

            const dto: any = {
                odometroKm: 10000,
                estadoGeneral: ComponentEstado.NOT_OK,
                items: [{ nombre: 'Frenos', critical: true, estado: ComponentEstado.NOT_OK }]
            };

            await service.createInspection('veh-1', 'user-1', dto);

            expect(prisma.vehicleInspection.create).toHaveBeenCalled();
            expect(prisma.vehicle.update).toHaveBeenCalledWith({
                where: { id: 'veh-1' },
                data: expect.objectContaining({ estado: 'BLOQUEADO_SEGURIDAD' })
            });
            expect(eventEmitter.emit).toHaveBeenCalledWith('vehicle.blocked', { vehicleId: 'veh-1', inspectionId: 'insp-1' });
        });
    });
});
