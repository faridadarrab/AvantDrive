import { IsString, IsOptional, IsEmail, IsEnum } from 'class-validator';
import { CustomerTipo } from '@prisma/client';

export class CreateCustomerDto {
    @IsString() nombre: string;
    @IsEmail() @IsOptional() email?: string;
    @IsString() @IsOptional() telefono?: string;
    @IsString() @IsOptional() nif?: string;
    @IsString() @IsOptional() direccion?: string;
    @IsEnum(CustomerTipo) @IsOptional() tipo?: CustomerTipo;
}

export class UpdateCustomerDto {
    @IsString() @IsOptional() nombre?: string;
    @IsEmail() @IsOptional() email?: string;
    @IsString() @IsOptional() telefono?: string;
    @IsString() @IsOptional() nif?: string;
    @IsString() @IsOptional() direccion?: string;
    @IsEnum(CustomerTipo) @IsOptional() tipo?: CustomerTipo;
}
