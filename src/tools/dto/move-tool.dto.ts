import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ToolMovementTipo } from '@prisma/client';

export class MoveToolDto {
    @IsString()
    toolId!: string;

    @IsEnum(ToolMovementTipo)
    tipo!: ToolMovementTipo;

    @IsOptional()
    @IsString()
    locationOrigenId?: string;

    @IsOptional()
    @IsString()
    locationDestinoId?: string;

    @IsOptional()
    @IsString()
    workOrderId?: string;

    @IsOptional()
    @IsString()
    solicitudId?: string;
}
