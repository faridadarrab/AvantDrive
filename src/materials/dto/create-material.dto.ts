import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsEnum } from 'class-validator';
import { Gremio } from '@prisma/client';

export class CreateMaterialDto {
    @IsString()
    @IsNotEmpty()
    nombre: string;

    @IsEnum(Gremio)
    @IsNotEmpty()
    gremio: Gremio;

    @IsString()
    @IsOptional()
    categoria?: string;

    @IsString()
    @IsOptional()
    codigoRef?: string;

    @IsString()
    @IsNotEmpty()
    unidad: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    stockMinimo?: number;

    @IsNumber()
    @Min(0)
    precioUnitarioCompra: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    precioUnitarioVenta?: number;

    @IsString()
    @IsOptional()
    proveedor?: string;

    @IsString()
    @IsNotEmpty()
    locationId: string;
}
