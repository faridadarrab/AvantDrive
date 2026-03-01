import { IsNumber, IsOptional, IsString, IsUUID, IsEnum, Min } from 'class-validator';
import { CashMovementTipo } from '@prisma/client';

export class OpenCashSessionDto {
    @IsNumber() @Min(0) saldoInicial: number;
}

export class CloseCashSessionDto {
    @IsNumber() saldoFinal: number;
    @IsUUID() @IsOptional() approvalRequestId?: string; // R8b: required for reset
}

export class CreateCashMovementDto {
    @IsUUID() sessionId: string;
    @IsEnum(CashMovementTipo) tipo: CashMovementTipo;
    @IsString() concepto: string;
    @IsNumber() importe: number;
    @IsUUID() @IsOptional() invoiceId?: string;
}
