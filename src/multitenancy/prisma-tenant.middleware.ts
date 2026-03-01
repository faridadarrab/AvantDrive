import { Prisma } from '@prisma/client';
import { ClsServiceManager } from 'nestjs-cls';

/**
 * Tables that require automatic companyScope filtering.
 * Rule R10: company_scope filtrado en TODOS los repositorios Prisma siempre.
 */
const TENANT_SCOPED_MODELS = new Set([
    'User',
    'ApprovalRequest',
    'AuditLog',
    'DocumentSeries',
]);

/**
 * Prisma middleware that automatically:
 * 1. Adds companyScope WHERE clause to all find/update/delete queries
 * 2. Sets companyScope on all create operations
 *
 * This is the second line of defense (after RLS).
 */
export function prismaTenantMiddleware(): Prisma.Middleware {
    return async (
        params: Prisma.MiddlewareParams,
        next: (params: Prisma.MiddlewareParams) => Promise<any>,
    ) => {
        const cls = ClsServiceManager.getClsService();
        const companyScope = cls?.get('companyScope');

        // If no tenant context (e.g., system operations), pass through
        if (!companyScope || !params.model || !TENANT_SCOPED_MODELS.has(params.model)) {
            return next(params);
        }

        // Read operations: inject WHERE companyScope
        if (
            params.action === 'findUnique' ||
            params.action === 'findFirst' ||
            params.action === 'findMany' ||
            params.action === 'count' ||
            params.action === 'aggregate'
        ) {
            if (!params.args) params.args = {};
            if (!params.args.where) params.args.where = {};
            params.args.where.companyScope = companyScope;
        }

        // Update/delete operations: inject WHERE companyScope
        if (
            params.action === 'update' ||
            params.action === 'updateMany' ||
            params.action === 'delete' ||
            params.action === 'deleteMany'
        ) {
            if (!params.args) params.args = {};
            if (!params.args.where) params.args.where = {};
            params.args.where.companyScope = companyScope;
        }

        // Create operations: set companyScope
        if (params.action === 'create' || params.action === 'createMany') {
            if (!params.args) params.args = {};
            if (params.action === 'create') {
                if (!params.args.data) params.args.data = {};
                params.args.data.companyScope = companyScope;
            }
            if (params.action === 'createMany') {
                if (Array.isArray(params.args.data)) {
                    params.args.data = params.args.data.map((d: any) => ({
                        ...d,
                        companyScope,
                    }));
                }
            }
        }

        return next(params);
    };
}
