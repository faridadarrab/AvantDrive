// src/sat/dto/create-pago.dto.ts
import {
    IsUUID, IsEnum, IsNumber, IsPositive, IsString, IsOptional,
} from 'class-validator';
import { PagoMetodo } from '@prisma/client';

export class CreatePagoDto {
    @IsUUID()
    ordenTrabajoId: string;

    @IsEnum(PagoMetodo)
    metodo: PagoMetodo;

    @IsNumber()
    @IsPositive()
    importe: number;

    @IsString()
    @IsOptional()
    referencia?: string;

    @IsString()
    @IsOptional()
    notas?: string;
}
