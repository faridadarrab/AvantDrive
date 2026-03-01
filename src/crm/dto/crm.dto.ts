import { IsString, IsOptional, IsEmail, IsEnum, IsDateString, IsUUID, IsInt, IsBoolean, Min } from 'class-validator';
import { ContactTipo, InteractionTipo, ContractEstado } from '@prisma/client';

export class CreateContactDto {
    @IsString() nombre: string;
    @IsString() @IsOptional() apellidos?: string;
    @IsEmail() @IsOptional() email?: string;
    @IsString() @IsOptional() telefono?: string;
    @IsString() @IsOptional() movil?: string;
    @IsString() @IsOptional() cargo?: string;
    @IsString() @IsOptional() empresa?: string;
    @IsEnum(ContactTipo) @IsOptional() tipo?: ContactTipo;
    @IsString() @IsOptional() notas?: string;
}

export class UpdateContactDto {
    @IsString() @IsOptional() nombre?: string;
    @IsString() @IsOptional() apellidos?: string;
    @IsEmail() @IsOptional() email?: string;
    @IsString() @IsOptional() telefono?: string;
    @IsString() @IsOptional() movil?: string;
    @IsString() @IsOptional() cargo?: string;
    @IsString() @IsOptional() empresa?: string;
    @IsEnum(ContactTipo) @IsOptional() tipo?: ContactTipo;
    @IsString() @IsOptional() notas?: string;
}

export class CreateInteractionDto {
    @IsEnum(InteractionTipo) tipo: InteractionTipo;
    @IsString() asunto: string;
    @IsString() @IsOptional() descripcion?: string;
    @IsDateString() @IsOptional() fecha?: string;
    @IsInt() @Min(0) @IsOptional() duracionMin?: number;
    @IsString() @IsOptional() resultado?: string;
}

export class CreateContractDto {
    @IsUUID() contactId: string;
    @IsString() titulo: string;
    @IsString() @IsOptional() descripcion?: string;
    @IsDateString() fechaInicio: string;
    @IsDateString() @IsOptional() fechaFin?: string;
    @IsOptional() valor?: number;
    @IsEnum(ContractEstado) @IsOptional() estado?: ContractEstado;
    @IsString() @IsOptional() documentoUrl?: string;
}

export class UpdateContractDto {
    @IsString() @IsOptional() titulo?: string;
    @IsString() @IsOptional() descripcion?: string;
    @IsDateString() @IsOptional() fechaFin?: string;
    @IsOptional() valor?: number;
    @IsEnum(ContractEstado) @IsOptional() estado?: ContractEstado;
    @IsString() @IsOptional() documentoUrl?: string;
}

export class CreateReminderDto {
    @IsUUID() @IsOptional() contactId?: string;
    @IsUUID() @IsOptional() contractId?: string;
    @IsString() titulo: string;
    @IsString() @IsOptional() descripcion?: string;
    @IsDateString() fechaVencimiento: string;
}

export class CreateTagDto {
    @IsString() nombre: string;
    @IsString() @IsOptional() color?: string;
}
