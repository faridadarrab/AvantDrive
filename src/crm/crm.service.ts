import {
    Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClsService } from 'nestjs-cls';
import { ContractEstado, RoleName } from '@prisma/client';
import {
    CreateContactDto, UpdateContactDto, CreateInteractionDto,
    CreateContractDto, UpdateContractDto, CreateReminderDto, CreateTagDto,
} from './dto/crm.dto';

@Injectable()
export class CrmService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cls: ClsService,
    ) { }

    private currentUser() {
        return this.cls.get('user') as { id: string; roles: RoleName[]; companyScope: string };
    }

    // ─── Contacts ─────────────────────────────────────────────────────────────

    async createContact(dto: CreateContactDto) {
        const user = this.currentUser();
        return this.prisma.contact.create({
            data: { ...dto, companyScope: user.companyScope },
        });
    }

    /** Full-text search by nombre, email, empresa, telefono */
    async findAllContacts(q?: string) {
        const user = this.currentUser();
        const where: any = { companyScope: user.companyScope, deletedAt: null };

        if (q) {
            where.OR = [
                { nombre: { contains: q, mode: 'insensitive' } },
                { apellidos: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { empresa: { contains: q, mode: 'insensitive' } },
                { telefono: { contains: q, mode: 'insensitive' } },
                { movil: { contains: q, mode: 'insensitive' } },
            ];
        }

        return this.prisma.contact.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { tags: { include: { tag: true } } },
        });
    }

    async findOneContact(id: string) {
        const user = this.currentUser();
        const c = await this.prisma.contact.findFirst({
            where: { id, companyScope: user.companyScope, deletedAt: null },
            include: { tags: { include: { tag: true } }, contracts: true },
        });
        if (!c) throw new NotFoundException(`Contact ${id} no encontrado`);
        return c;
    }

    async updateContact(id: string, dto: UpdateContactDto) {
        await this.findOneContact(id);
        return this.prisma.contact.update({ where: { id }, data: dto });
    }

    // ─── Interactions ─────────────────────────────────────────────────────────

    async createInteraction(contactId: string, dto: CreateInteractionDto) {
        const user = this.currentUser();
        await this.findOneContact(contactId);
        return this.prisma.interaction.create({
            data: {
                contactId,
                tipo: dto.tipo,
                asunto: dto.asunto,
                descripcion: dto.descripcion,
                fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
                duracionMin: dto.duracionMin,
                resultado: dto.resultado,
                userId: user.id,
                companyScope: user.companyScope,
            },
        });
    }

    async findInteractionsByContact(contactId: string) {
        const user = this.currentUser();
        return this.prisma.interaction.findMany({
            where: { contactId, companyScope: user.companyScope },
            orderBy: { fecha: 'desc' },
        });
    }

    /** Timeline = interactions ordered by date */
    async getTimeline(contactId: string) {
        const user = this.currentUser();
        await this.findOneContact(contactId);
        return this.prisma.interaction.findMany({
            where: { contactId, companyScope: user.companyScope },
            orderBy: { fecha: 'desc' },
            include: { user: { select: { id: true, nombre: true, email: true } } },
        });
    }

    // ─── Contracts ────────────────────────────────────────────────────────────

    async createContract(dto: CreateContractDto) {
        const user = this.currentUser();
        await this.findOneContact(dto.contactId);
        return this.prisma.contract.create({
            data: {
                contactId: dto.contactId,
                titulo: dto.titulo,
                descripcion: dto.descripcion,
                fechaInicio: new Date(dto.fechaInicio),
                fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : undefined,
                valor: dto.valor,
                estado: dto.estado,
                documentoUrl: dto.documentoUrl,
                companyScope: user.companyScope,
            },
        });
    }

    async findAllContracts() {
        const user = this.currentUser();
        return this.prisma.contract.findMany({
            where: { companyScope: user.companyScope },
            orderBy: { createdAt: 'desc' },
            include: { contact: true },
        });
    }

    async updateContract(id: string, dto: UpdateContractDto) {
        const user = this.currentUser();
        const c = await this.prisma.contract.findFirst({ where: { id, companyScope: user.companyScope } });
        if (!c) throw new NotFoundException(`Contract ${id} no encontrado`);
        return this.prisma.contract.update({
            where: { id }, data: {
                ...dto,
                ...(dto.fechaFin ? { fechaFin: new Date(dto.fechaFin) } : {}),
            }
        });
    }

    /** Contracts expiring within 30 days */
    async findExpiringSoon() {
        const user = this.currentUser();
        const now = new Date();
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        return this.prisma.contract.findMany({
            where: {
                companyScope: user.companyScope,
                estado: ContractEstado.ACTIVO,
                fechaFin: { gte: now, lte: in30Days },
            },
            orderBy: { fechaFin: 'asc' },
            include: { contact: true },
        });
    }

    // ─── Reminders ────────────────────────────────────────────────────────────

    async createReminder(dto: CreateReminderDto) {
        const user = this.currentUser();
        return this.prisma.reminder.create({
            data: {
                contactId: dto.contactId,
                contractId: dto.contractId,
                titulo: dto.titulo,
                descripcion: dto.descripcion,
                fechaVencimiento: new Date(dto.fechaVencimiento),
                userId: user.id,
                companyScope: user.companyScope,
            },
        });
    }

    async completeReminder(id: string) {
        const user = this.currentUser();
        const r = await this.prisma.reminder.findFirst({ where: { id, userId: user.id } });
        if (!r) throw new NotFoundException(`Reminder ${id} no encontrado`);
        return this.prisma.reminder.update({ where: { id }, data: { completado: true } });
    }

    /** Reminders due today for current user */
    async findTodayReminders() {
        const user = this.currentUser();
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

        return this.prisma.reminder.findMany({
            where: {
                userId: user.id,
                companyScope: user.companyScope,
                completado: false,
                fechaVencimiento: { gte: todayStart, lte: todayEnd },
            },
            orderBy: { fechaVencimiento: 'asc' },
            include: { contact: true, contract: true },
        });
    }

    async findAllReminders() {
        const user = this.currentUser();
        return this.prisma.reminder.findMany({
            where: { userId: user.id, companyScope: user.companyScope },
            orderBy: { fechaVencimiento: 'asc' },
            include: { contact: true, contract: true },
        });
    }

    // ─── Tags ─────────────────────────────────────────────────────────────────

    async createTag(dto: CreateTagDto) {
        const user = this.currentUser();
        return this.prisma.tag.create({
            data: { nombre: dto.nombre, color: dto.color ?? '#3B82F6', companyScope: user.companyScope },
        });
    }

    async findAllTags() {
        const user = this.currentUser();
        return this.prisma.tag.findMany({ where: { companyScope: user.companyScope } });
    }

    async addTagToContact(contactId: string, tagId: string) {
        return this.prisma.contactTag.create({ data: { contactId, tagId } });
    }

    // ─── CSV Import ───────────────────────────────────────────────────────────

    async importContactsCsv(csvContent: string) {
        const user = this.currentUser();
        const lines = csvContent.trim().split('\n');
        if (lines.length < 2) return { imported: 0 };

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const contacts: any[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const record: any = { companyScope: user.companyScope };
            headers.forEach((h, idx) => {
                if (values[idx]) record[h] = values[idx];
            });
            if (record.nombre) contacts.push(record);
        }

        const result = await this.prisma.contact.createMany({ data: contacts, skipDuplicates: true });
        return { imported: result.count };
    }
}
