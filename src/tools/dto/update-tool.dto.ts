import { IsString, IsOptional, IsNumber, IsDateString, IsEnum } from 'class-validator';
import { ToolEstado } from '@prisma/client';

export class UpdateToolDto {
    @IsOptional()
    @IsString()
    nombre?: string;

    @IsOptional()
    @IsString()
    categoria?: string;

    @IsOptional()
    @IsEnum(ToolEstado)
    estado?: ToolEstado;

    @IsOptional()
    @IsString()
    locationId?: string;

    @IsOptional()
    @IsNumber()
    precioCompra?: number;

    @IsOptional()
    @IsNumber()
    valorActual?: number;

    @IsOptional()
    @IsString()
    proveedor?: string;

    @IsOptional()
    @IsDateString()
    proximoMantenimiento?: string;

    @IsOptional()
    @IsString()
    numeroSerie?: string;

    @IsOptional()
    @IsDateString()
    deletedAt?: string;
}
