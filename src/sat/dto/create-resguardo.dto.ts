// src/sat/dto/create-resguardo.dto.ts
import {
    IsUUID, IsString, IsInt, IsPositive, IsOptional, IsNumber, Min,
} from 'class-validator';

export class CreateResguardoDto {
    @IsUUID()
    ordenTrabajoId: string;

    @IsString()
    descripcion: string;

    @IsInt()
    @IsPositive()
    @IsOptional()
    cantidad?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    valorDeclarado?: number;
}
