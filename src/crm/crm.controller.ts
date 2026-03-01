import {
    Controller, Get, Post, Patch, Body, Param, Query,
    ParseUUIDPipe, UseGuards,
} from '@nestjs/common';
import { CrmService } from './crm.service';
import {
    CreateContactDto, UpdateContactDto, CreateInteractionDto,
    CreateContractDto, UpdateContractDto, CreateReminderDto, CreateTagDto,
} from './dto/crm.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('crm')
export class CrmController {
    constructor(private readonly crm: CrmService) { }

    // ── Contacts ──────────────────
    @Post('contacts')
    createContact(@Body() dto: CreateContactDto) { return this.crm.createContact(dto); }

    @Get('contacts')
    findContacts(@Query('q') q?: string) { return this.crm.findAllContacts(q); }

    @Get('contacts/:id')
    findContact(@Param('id', ParseUUIDPipe) id: string) { return this.crm.findOneContact(id); }

    @Patch('contacts/:id')
    updateContact(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateContactDto) {
        return this.crm.updateContact(id, dto);
    }

    @Post('contacts/import')
    importContacts(@Body() body: { csv: string }) {
        return this.crm.importContactsCsv(body.csv);
    }

    // ── Interactions ──────────────
    @Post('contacts/:id/interactions')
    createInteraction(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CreateInteractionDto,
    ) { return this.crm.createInteraction(id, dto); }

    @Get('contacts/:id/interactions')
    findInteractions(@Param('id', ParseUUIDPipe) id: string) {
        return this.crm.findInteractionsByContact(id);
    }

    @Get('contacts/:id/timeline')
    getTimeline(@Param('id', ParseUUIDPipe) id: string) {
        return this.crm.getTimeline(id);
    }

    // ── Contracts ─────────────────
    @Post('contracts')
    createContract(@Body() dto: CreateContractDto) { return this.crm.createContract(dto); }

    @Get('contracts')
    findContracts() { return this.crm.findAllContracts(); }

    @Patch('contracts/:id')
    updateContract(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateContractDto) {
        return this.crm.updateContract(id, dto);
    }

    @Get('contracts/expiring-soon')
    findExpiringSoon() { return this.crm.findExpiringSoon(); }

    // ── Reminders ─────────────────
    @Post('reminders')
    createReminder(@Body() dto: CreateReminderDto) { return this.crm.createReminder(dto); }

    @Get('reminders')
    findReminders() { return this.crm.findAllReminders(); }

    @Get('reminders/today')
    findTodayReminders() { return this.crm.findTodayReminders(); }

    @Patch('reminders/:id/complete')
    completeReminder(@Param('id', ParseUUIDPipe) id: string) {
        return this.crm.completeReminder(id);
    }

    // ── Tags ──────────────────────
    @Post('tags')
    createTag(@Body() dto: CreateTagDto) { return this.crm.createTag(dto); }

    @Get('tags')
    findTags() { return this.crm.findAllTags(); }
}
