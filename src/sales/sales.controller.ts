import {
    Controller, Get, Post, Patch, Body, Param, ParseUUIDPipe, Query, UseGuards,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { CreateQuoteDto, CreateDeliveryNoteDto, CreateInvoiceDto, VoidInvoiceDto } from './dto/sales.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuoteEstado } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
    constructor(private readonly sales: SalesService) { }

    // ── Customers ─────────────────
    @Post('customers')
    createCustomer(@Body() dto: CreateCustomerDto) { return this.sales.createCustomer(dto); }

    @Get('customers')
    findAllCustomers() { return this.sales.findAllCustomers(); }

    @Get('customers/:id')
    findCustomer(@Param('id', ParseUUIDPipe) id: string) { return this.sales.findOneCustomer(id); }

    @Patch('customers/:id')
    updateCustomer(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCustomerDto) {
        return this.sales.updateCustomer(id, dto);
    }

    // ── Quotes ────────────────────
    @Post('quotes')
    createQuote(@Body() dto: CreateQuoteDto) { return this.sales.createQuote(dto); }

    @Get('quotes')
    findAllQuotes() { return this.sales.findAllQuotes(); }

    @Patch('quotes/:id')
    updateQuoteEstado(@Param('id', ParseUUIDPipe) id: string, @Query('estado') estado: QuoteEstado) {
        return this.sales.updateQuoteEstado(id, estado);
    }

    @Post('quotes/:id/accept')
    acceptQuote(@Param('id', ParseUUIDPipe) id: string) { return this.sales.acceptQuote(id); }

    // ── Delivery Notes ────────────
    @Post('delivery-notes')
    createDeliveryNote(@Body() dto: CreateDeliveryNoteDto) { return this.sales.createDeliveryNote(dto); }

    @Get('delivery-notes')
    findAllDeliveryNotes() { return this.sales.findAllDeliveryNotes(); }

    @Patch('delivery-notes/:id/deliver')
    deliverNote(@Param('id', ParseUUIDPipe) id: string) { return this.sales.deliverDeliveryNote(id); }

    // ── Invoices ──────────────────
    @Post('invoices')
    createInvoice(@Body() dto: CreateInvoiceDto) { return this.sales.createInvoice(dto); }

    @Get('invoices')
    findAllInvoices() { return this.sales.findAllInvoices(); }

    @Patch('invoices/:id/pay')
    payInvoice(@Param('id', ParseUUIDPipe) id: string) { return this.sales.payInvoice(id); }

    @Patch('invoices/:id/void')
    voidInvoice(@Param('id', ParseUUIDPipe) id: string, @Body() dto: VoidInvoiceDto) {
        return this.sales.voidInvoice(id, dto);
    }
}
