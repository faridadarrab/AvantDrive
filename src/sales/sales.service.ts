import {
    Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClsService } from 'nestjs-cls';
import { QuoteEstado, DeliveryNoteEstado, InvoiceEstado, RoleName } from '@prisma/client';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { CreateQuoteDto, CreateDeliveryNoteDto, CreateInvoiceDto, VoidInvoiceDto } from './dto/sales.dto';

@Injectable()
export class SalesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cls: ClsService,
    ) { }

    private currentUser() {
        return this.cls.get('user') as { id: string; roles: RoleName[]; companyScope: string };
    }

    // ─── Customers ────────────────────────────────────────────────────────────

    async createCustomer(dto: CreateCustomerDto) {
        const user = this.currentUser();
        return this.prisma.customer.create({
            data: { ...dto, companyScope: user.companyScope },
        });
    }

    async findAllCustomers() {
        const user = this.currentUser();
        return this.prisma.customer.findMany({
            where: { companyScope: user.companyScope, deletedAt: null },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOneCustomer(id: string) {
        const user = this.currentUser();
        const c = await this.prisma.customer.findFirst({
            where: { id, companyScope: user.companyScope, deletedAt: null },
        });
        if (!c) throw new NotFoundException(`Customer ${id} no encontrado`);
        return c;
    }

    async updateCustomer(id: string, dto: UpdateCustomerDto) {
        await this.findOneCustomer(id);
        return this.prisma.customer.update({ where: { id }, data: dto });
    }

    // ─── Quotes ───────────────────────────────────────────────────────────────

    async createQuote(dto: CreateQuoteDto) {
        const user = this.currentUser();
        await this.findOneCustomer(dto.customerId);
        const count = await this.prisma.quote.count({ where: { companyScope: user.companyScope } });
        const numero = `COT-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

        return this.prisma.quote.create({
            data: {
                numero,
                customerId: dto.customerId,
                items: dto.items as any,
                subtotal: dto.subtotal,
                descuento: dto.descuento ?? 0,
                total: dto.total,
                validoHasta: dto.validoHasta ? new Date(dto.validoHasta) : undefined,
                creadoPorId: user.id,
                companyScope: user.companyScope,
            },
        });
    }

    async findAllQuotes() {
        const user = this.currentUser();
        return this.prisma.quote.findMany({
            where: { companyScope: user.companyScope },
            orderBy: { createdAt: 'desc' },
            include: { customer: true },
        });
    }

    async updateQuoteEstado(id: string, estado: QuoteEstado) {
        const user = this.currentUser();
        const q = await this.prisma.quote.findFirst({ where: { id, companyScope: user.companyScope } });
        if (!q) throw new NotFoundException(`Quote ${id} no encontrado`);
        return this.prisma.quote.update({ where: { id }, data: { estado } });
    }

    async acceptQuote(id: string) {
        return this.updateQuoteEstado(id, QuoteEstado.ACEPTADO);
    }

    // ─── Delivery Notes ───────────────────────────────────────────────────────

    async createDeliveryNote(dto: CreateDeliveryNoteDto) {
        const user = this.currentUser();
        await this.findOneCustomer(dto.customerId);
        const count = await this.prisma.deliveryNote.count({ where: { companyScope: user.companyScope } });
        const numero = `ALB-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

        return this.prisma.deliveryNote.create({
            data: {
                numero,
                quoteId: dto.quoteId,
                customerId: dto.customerId,
                items: dto.items as any,
                total: dto.total,
                creadoPorId: user.id,
                companyScope: user.companyScope,
            },
        });
    }

    async findAllDeliveryNotes() {
        const user = this.currentUser();
        return this.prisma.deliveryNote.findMany({
            where: { companyScope: user.companyScope },
            orderBy: { createdAt: 'desc' },
            include: { customer: true },
        });
    }

    async deliverDeliveryNote(id: string) {
        const user = this.currentUser();
        const dn = await this.prisma.deliveryNote.findFirst({ where: { id, companyScope: user.companyScope } });
        if (!dn) throw new NotFoundException(`DeliveryNote ${id} no encontrado`);
        return this.prisma.deliveryNote.update({ where: { id }, data: { estado: DeliveryNoteEstado.ENTREGADO } });
    }

    // ─── Invoices ─────────────────────────────────────────────────────────────

    async createInvoice(dto: CreateInvoiceDto) {
        const user = this.currentUser();
        await this.findOneCustomer(dto.customerId);
        const count = await this.prisma.invoice.count({ where: { companyScope: user.companyScope } });
        const numero = `FAC-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

        return this.prisma.invoice.create({
            data: {
                numero,
                deliveryNoteId: dto.deliveryNoteId,
                customerId: dto.customerId,
                items: dto.items as any,
                subtotal: dto.subtotal,
                iva: dto.iva ?? 21,
                total: dto.total,
                metodoPago: dto.metodoPago,
                creadoPorId: user.id,
                companyScope: user.companyScope,
            },
        });
    }

    async findAllInvoices() {
        const user = this.currentUser();
        return this.prisma.invoice.findMany({
            where: { companyScope: user.companyScope },
            orderBy: { createdAt: 'desc' },
            include: { customer: true },
        });
    }

    async payInvoice(id: string) {
        const user = this.currentUser();
        const inv = await this.prisma.invoice.findFirst({ where: { id, companyScope: user.companyScope } });
        if (!inv) throw new NotFoundException(`Invoice ${id} no encontrada`);
        return this.prisma.invoice.update({ where: { id }, data: { estado: InvoiceEstado.PAGADA } });
    }

    /** R8a: Voiding an invoice requires an approved ApprovalRequest */
    async voidInvoice(id: string, dto: VoidInvoiceDto) {
        const user = this.currentUser();
        const inv = await this.prisma.invoice.findFirst({ where: { id, companyScope: user.companyScope } });
        if (!inv) throw new NotFoundException(`Invoice ${id} no encontrada`);
        if (inv.estado === InvoiceEstado.ANULADA) throw new BadRequestException('La factura ya está anulada');

        // R8a: must have approved ApprovalRequest
        const approval = await this.prisma.approvalRequest.findFirst({
            where: { id: dto.approvalRequestId, companyScope: user.companyScope },
        });
        if (!approval || approval.estado !== 'APROBADA') {
            throw new BadRequestException('R8a: Anular factura requiere ApprovalRequest APROBADA previa');
        }

        return this.prisma.invoice.update({
            where: { id },
            data: { estado: InvoiceEstado.ANULADA, approvalRequestId: dto.approvalRequestId },
        });
    }
}
