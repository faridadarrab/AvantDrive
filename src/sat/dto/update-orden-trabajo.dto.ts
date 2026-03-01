// src/sat/dto/update-orden-trabajo.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import {
    IsEnum, IsOptional, IsString, IsBoolean, IsDateString,
} from 'class-validator';
import { OTEstado } from '@prisma/client';
import { CreateOrdenTrabajoDto } from './create-orden-trabajo.dto';

export class UpdateOrdenTrabajoDto extends PartialType(CreateOrdenTrabajoDto) {
    @IsEnum(OTEstado)
    @IsOptional()
    estado?: OTEstado;

    @IsString()
    @IsOptional()
    diagnostico?: string;

    @IsBoolean()
    @IsOptional()
    contrafirmaCliente?: boolean;

    @IsDateString()
    @IsOptional()
    fechaEntregaReal?: string;
}
