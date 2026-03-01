import { IsString, IsNotEmpty, IsInt, IsOptional, Min, Max, IsUUID, IsEnum } from 'class-validator';
import { VehicleEstado } from '@prisma/client';

export class CreateVehicleDto {
    @IsString()
    @IsNotEmpty()
    matricula: string;

    @IsString()
    @IsNotEmpty()
    marca: string;

    @IsString()
    @IsNotEmpty()
    modelo: string;

    @IsInt()
    @Min(1900)
    @Max(2100)
    anio: number;

    @IsInt()
    @Min(0)
    kmActualValidado: number;

    @IsUUID()
    @IsOptional()
    operarioAsignadoId?: string;

    @IsEnum(VehicleEstado)
    @IsOptional()
    estado?: VehicleEstado;
}
