// src/sat/dto/create-orden-trabajo.dto.ts
import {
    IsString, IsEnum, IsOptional, IsDateString, IsEmail,
} from 'class-validator';
import { OTTipo, OTPrioridad } from '@prisma/client';

export class CreateOrdenTrabajoDto {
    @IsEnum(OTTipo)
    tipo: OTTipo = OTTipo.CORRECTIVO;

    @IsEnum(OTPrioridad)
    @IsOptional()
    prioridad?: OTPrioridad;

    @IsString()
    clienteNombre: string;

    @IsString()
    @IsOptional()
    clienteTelefono?: string;

    @IsEmail()
    @IsOptional()
    clienteEmail?: string;

    @IsString()
    equipoDescripcion: string;

    @IsString()
    @IsOptional()
    equipoMarca?: string;

    @IsString()
    @IsOptional()
    equipoModelo?: string;

    @IsString()
    @IsOptional()
    equipoNumSerie?: string;

    @IsString()
    fallaReportada: string;

    @IsString()
    @IsOptional()
    tecnicoId?: string;

    @IsDateString()
    @IsOptional()
    fechaCompromiso?: string;

    @IsString()
    @IsOptional()
    observaciones?: string;
}
