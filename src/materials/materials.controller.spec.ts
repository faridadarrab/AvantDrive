/// <reference types="vitest/globals" />
import { Test, TestingModule } from '@nestjs/testing';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClsService } from 'nestjs-cls';

describe('MaterialsController', () => {
  let controller: MaterialsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaterialsController],
      providers: [
        MaterialsService,
        { provide: PrismaService, useValue: {} },
        { provide: ClsService, useValue: { get: vi.fn() } }
      ],
    }).compile();

    controller = module.get<MaterialsController>(MaterialsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
