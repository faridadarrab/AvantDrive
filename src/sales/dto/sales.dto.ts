import { IsUUID, IsArray, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateQuoteDto {
    @IsUUID() customerId: string;
    @IsArray() items: any[];
    @IsNumber() @Min(0) subtotal: number;
    @IsNumber() @Min(0) @IsOptional() descuento?: number;
    @IsNumber() @Min(0) total: number;
    @IsDateString() @IsOptional() validoHasta?: string;
}

export class CreateDeliveryNoteDto {
    @IsUUID() @IsOptional() quoteId?: string;
    @IsUUID() customerId: string;
    @IsArray() items: any[];
    @IsNumber() @Min(0) total: number;
}

export class CreateInvoiceDto {
    @IsUUID() @IsOptional() deliveryNoteId?: string;
    @IsUUID() customerId: string;
    @IsArray() items: any[];
    @IsNumber() @Min(0) subtotal: number;
    @IsNumber() @Min(0) @IsOptional() iva?: number;
    @IsNumber() @Min(0) total: number;
    @IsOptional() metodoPago?: string;
}

export class VoidInvoiceDto {
    @IsUUID() approvalRequestId: string;
}
