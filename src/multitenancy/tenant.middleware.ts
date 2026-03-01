import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Middleware that reads companyScope from JWT (set by JwtAuthGuard)
 * and configures PostgreSQL session for RLS.
 *
 * - Stores companyScope in CLS (AsyncLocalStorage)
 * - Executes SET app.current_tenant_id for RLS policies
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
    private readonly logger = new Logger(TenantMiddleware.name);

    constructor(
        private readonly cls: ClsService,
        private readonly prisma: PrismaService,
    ) { }

    async use(req: FastifyRequest['raw'] & { user?: any }, res: FastifyReply['raw'], next: () => void) {
        const user = (req as any).user;
        const companyScope = user?.companyScope;

        if (companyScope) {
            // Store in CLS for access anywhere in the request scope
            this.cls.set('companyScope', companyScope);
            this.cls.set('userId', user.sub);

            // Set PostgreSQL session variable for RLS
            try {
                await this.prisma.setTenantId(companyScope);
            } catch (err) {
                this.logger.error('Failed to set tenant ID', err);
            }
        }

        next();
    }
}
