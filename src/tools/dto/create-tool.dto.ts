import { IsString, IsOptional, IsNumber, IsDateString, IsEnum } from 'class-validator';
import { ToolEstado } from '@prisma/client';

export class CreateToolDto {
    @IsString()
    nombre!: string;

    @IsOptional()
    @IsString()
    categoria?: string;

    @IsString()
    qrCode!: string;

    @IsOptional()
    @IsEnum(ToolEstado)
    estado?: ToolEstado;

    @IsString()
    locationId!: string;

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
}
