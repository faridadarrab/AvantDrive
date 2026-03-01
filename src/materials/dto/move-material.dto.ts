import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsEnum } from 'class-validator';
import { MaterialMovementTipo } from '@prisma/client';

export class MoveMaterialDto {
    @IsString()
    @IsNotEmpty()
    materialId: string;

    @IsEnum(MaterialMovementTipo)
    @IsNotEmpty()
    tipo: MaterialMovementTipo;

    @IsNumber()
    @Min(0.01)
    cantidad: number;

    @IsString()
    @IsNotEmpty()
    locationId: string; // The location where the movement happens

    @IsString()
    @IsOptional()
    operarioDestinoId?: string; // For ASIGNACION

    @IsString()
    @IsOptional()
    workOrderId?: string; // Required for SALIDA (Rule R2)

    @IsString()
    @IsOptional()
    solicitudId?: string;
}
