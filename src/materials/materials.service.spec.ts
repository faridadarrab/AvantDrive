/// <reference types="vitest/globals" />
import { Test, TestingModule } from '@nestjs/testing';
import { MaterialsService } from './materials.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClsService } from 'nestjs-cls';
import { HttpException, HttpStatus } from '@nestjs/common';
import { MaterialMovementTipo, RoleName } from '@prisma/client';

vi.mock('@prisma/client', async (importOriginal: () => Promise<any>) => {
  const actual = await importOriginal();
  return {
    ...actual,
    MaterialMovementTipo: { ENTRADA: 'ENTRADA', SALIDA: 'SALIDA', AJUSTE: 'AJUSTE', ASIGNACION: 'ASIGNACION', DEVOLUCION: 'DEVOLUCION' },
    RoleName: { REPARADOR_DOMICILIO: 'REPARADOR_DOMICILIO', REPARADOR_TALLER: 'REPARADOR_TALLER', ADMINISTRADOR: 'ADMINISTRADOR' }
  };
});

describe('MaterialsService', () => {
  let service: MaterialsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      material: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn().mockResolvedValue({ id: 'mat-1', stockActual: 10 }),
        update: vi.fn().mockResolvedValue({ id: 'mat-1', stockActual: 5 }),
      },
      approvalRequest: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      userRole: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      $transaction: vi.fn((callback: (prisma: any) => any) => callback(prisma)),
      materialMovement: {
        create: vi.fn(),
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ClsService, useValue: { get: (key: string) => key === 'user' ? { id: 'usr-1' } : 'COMP1' } },
      ],
    }).compile();

    service = module.get<MaterialsService>(MaterialsService);
  });

  describe('Move Material (Anti-fraud rules)', () => {
    it('blocks REPARADOR from directly moving materials', async () => {
      prisma.userRole.findMany.mockResolvedValue([{ role: { nombre: 'REPARADOR_DOMICILIO' } }]);

      await expect(service.moveMaterial({
        materialId: 'mat-1',
        tipo: 'SALIDA' as any,
        cantidad: 1,
        locationId: 'loc-1'
      })).rejects.toThrow(HttpException);
    });

    it('R2: returns 400 Bad Request for SALIDA without workOrderId', async () => {
      try {
        await service.moveMaterial({
          materialId: 'mat-1',
          tipo: 'SALIDA' as any,
          cantidad: 1,
          locationId: 'loc-1'
        });
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(err.message).toContain('Rule R2');
      }
    });

    it('R3: requires ApprovalRequest for AJUSTE and creates pending request', async () => {
      try {
        await service.moveMaterial({
          materialId: 'mat-1',
          tipo: 'AJUSTE' as any,
          cantidad: 15, // Change stock to 15
          locationId: 'loc-1'
        });
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.ACCEPTED); // 202
        expect(prisma.approvalRequest.create).toHaveBeenCalled();
      }
    });

    it('R4: requires ApprovalRequest to soft delete material', async () => {
      prisma.approvalRequest.findFirst.mockResolvedValue(null);

      await expect(service.softDeleteMaterial('mat-1', 'app-req-1')).rejects.toThrow(HttpException);

      prisma.approvalRequest.findFirst.mockResolvedValue({ estado: 'APROBADA' });
      await service.softDeleteMaterial('mat-1', 'app-req-1');
      expect(prisma.material.update).toHaveBeenCalledWith({
        where: { id: 'mat-1' },
        data: { deletedAt: expect.any(Date) }
      });
    });
  });
});
