import {
    Injectable,
    OnModuleInit,
    OnModuleDestroy,
    Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor() {
        super({
            log: [
                { emit: 'event', level: 'query' },
                { emit: 'stdout', level: 'info' },
                { emit: 'stdout', level: 'warn' },
                { emit: 'stdout', level: 'error' },
            ],
        });
    }

    async onModuleInit(): Promise<void> {
        await this.$connect();
        this.logger.log('Prisma connected to PostgreSQL');
    }

    async onModuleDestroy(): Promise<void> {
        await this.$disconnect();
        this.logger.log('Prisma disconnected');
    }

    /**
     * Sets the current tenant ID for RLS policies.
     * Must be called at the start of each request.
     */
    async setTenantId(tenantId: string): Promise<void> {
        await this.$executeRawUnsafe(
            `SET app.current_tenant_id = '${tenantId}'`,
        );
    }

    /**
     * Clears the tenant ID setting.
     */
    async clearTenantId(): Promise<void> {
        await this.$executeRawUnsafe(`RESET app.current_tenant_id`);
    }
}
