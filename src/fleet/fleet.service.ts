import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ApprovalStatus, VehicleEstado } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClsService } from 'nestjs-cls';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateVehicleDto, UpdateVehicleDto, CreateGpsLogDto } from './dto';
import { CreateInspectionDto, ComponentEstado } from './dto/create-inspection.dto';

@Injectable()
export class FleetService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cls: ClsService,
        private readonly eventEmitter: EventEmitter2
    ) { }

    private get companyScope() {
        return this.cls.get('company_scope');
    }

    async findAllVehicles() {
        return this.prisma.vehicle.findMany({
            where: { companyScope: this.companyScope, deletedAt: null },
        });
    }

    async findVehicleById(id: string) {
        const vehicle = await this.prisma.vehicle.findFirst({
            where: { id, companyScope: this.companyScope, deletedAt: null },
        });
        if (!vehicle) throw new HttpException('Vehicle not found', HttpStatus.NOT_FOUND);
        return vehicle;
    }

    async createVehicle(dto: CreateVehicleDto) {
        return this.prisma.vehicle.create({
            data: {
                ...dto,
                companyScope: this.companyScope,
            },
        });
    }

    async updateVehicle(id: string, dto: UpdateVehicleDto) {
        const vehicle = await this.findVehicleById(id);
        return this.prisma.vehicle.update({
            where: { id: vehicle.id },
            data: dto,
        });
    }

    async unblockVehicle(id: string, approvalRequestId: string) {
        const vehicle = await this.findVehicleById(id);
        if (vehicle.estado !== 'BLOQUEADO_SEGURIDAD') {
            throw new HttpException('Vehicle is not blocked', HttpStatus.BAD_REQUEST);
        }

        const approval = await this.prisma.approvalRequest.findFirst({
            where: { id: approvalRequestId, companyScope: this.companyScope },
        });

        if (!approval || approval.estado !== 'APROBADA') {
            throw new HttpException('Requiere ApprovalRequest APROBADA previa', HttpStatus.FORBIDDEN);
        }

        return this.prisma.vehicle.update({
            where: { id: vehicle.id },
            data: { estado: 'OPERATIVO' as any },
        });
    }

    async createInspection(vehicleId: string, inspectorId: string, dto: CreateInspectionDto) {
        const vehicle = await this.findVehicleById(vehicleId);

        // R1: Odómetro no decreciente
        if (dto.odometroKm < vehicle.kmActualValidado) {
            await this.prisma.approvalRequest.create({
                data: {
                    tipo: 'correccion_odometro',
                    creadoPorId: inspectorId,
                    companyScope: this.companyScope,
                    contextJson: { vehicleId, submittedKm: dto.odometroKm, currentKm: vehicle.kmActualValidado },
                }
            });
            throw new HttpException('Odómetro reportado menor al actual. Pendiente de aprobación.', HttpStatus.ACCEPTED);
        }

        // R5: Inspección crítica
        let hasCriticalNotOk = false;
        for (const item of dto.items) {
            if (item.critical && (item.estado === ComponentEstado.NOT_OK || (item.estado as any) === 'NOT_OK')) {
                hasCriticalNotOk = true;
                break;
            }
        }

        const inspection = await this.prisma.vehicleInspection.create({
            data: {
                vehicleId: vehicle.id,
                inspectorId,
                odometroKm: dto.odometroKm,
                estadoGeneral: dto.estadoGeneral,
                items: dto.items as any,
                fotos: dto.fotos as any || [],
                companyScope: this.companyScope,
            }
        });

        if (dto.odometroKm > vehicle.kmActualValidado) {
            await this.prisma.vehicleOdometerLog.create({
                data: {
                    vehicleId: vehicle.id,
                    kmAnterior: vehicle.kmActualValidado,
                    kmNuevo: dto.odometroKm,
                    userId: inspectorId,
                }
            });
            await this.prisma.vehicle.update({
                where: { id: vehicle.id },
                data: { kmActualValidado: dto.odometroKm }
            });
        }

        if (hasCriticalNotOk) {
            await this.prisma.vehicle.update({
                where: { id: vehicle.id },
                data: { estado: 'BLOQUEADO_SEGURIDAD' as any }
            });
            this.eventEmitter.emit('vehicle.blocked', { vehicleId: vehicle.id, inspectionId: inspection.id });
        }

        return inspection;
    }

    async getInspections(vehicleId: string) {
        await this.findVehicleById(vehicleId);
        return this.prisma.vehicleInspection.findMany({
            where: { vehicleId, companyScope: this.companyScope },
            orderBy: { fecha: 'desc' }
        });
    }

    async addGpsLog(vehicleId: string, dto: CreateGpsLogDto) {
        const vehicle = await this.findVehicleById(vehicleId);
        const log = await this.prisma.gpsLog.create({
            data: {
                vehicleId: vehicle.id,
                lat: dto.lat,
                lon: dto.lon,
                velocidad: dto.velocidad,
                companyScope: this.companyScope,
            }
        });

        this.eventEmitter.emit('vehicle.location.update', log);
        return log;
    }

    async getGpsHistory(vehicleId: string, cursorId?: string) {
        await this.findVehicleById(vehicleId);
        return this.prisma.gpsLog.findMany({
            take: 50,
            skip: cursorId ? 1 : 0,
            cursor: cursorId ? { id: cursorId } : undefined,
            where: { vehicleId, companyScope: this.companyScope },
            orderBy: { timestamp: 'desc' }
        });
    }
}
