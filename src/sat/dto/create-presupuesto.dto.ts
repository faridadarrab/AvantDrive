// src/sat/dto/create-presupuesto.dto.ts
import {
    IsString, IsUUID, IsOptional, IsDateString,
    IsNumber, Min, Max, IsArray, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LineaPresupuestoDto {
    @IsString()
    concepto: string;

    @IsNumber()
    @Min(0.01)
    cantidad: number;

    @IsNumber()
    @Min(0)
    precioUnitario: number;

    @IsNumber()
    @Min(0)
    @Max(100)
    iva: number = 21;

    @IsUUID()
    @IsOptional()
    materialId?: string;
}

export class CreatePresupuestoDto {
    @IsUUID()
    ordenTrabajoId: string;

    @IsDateString()
    @IsOptional()
    validoHasta?: string;

    @IsNumber()
    @Min(0)
    @Max(100)
    @IsOptional()
    descuentoPct?: number;

    @IsString()
    @IsOptional()
    notasInternas?: string;

    @IsString()
    @IsOptional()
    notasCliente?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => LineaPresupuestoDto)
    lineas: LineaPresupuestoDto[];
}
