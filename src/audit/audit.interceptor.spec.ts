import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';

function createMockContext(
    method: string,
    body: any = {},
    user: any = null,
    params: any = {},
    url: string = '/test',
): ExecutionContext {
    const request = {
        method,
        body,
        user,
        params,
        url,
        ip: '127.0.0.1',
        headers: {},
        connection: { remoteAddress: '127.0.0.1' },
        routeOptions: { url },
    };

    return {
        switchToHttp: () => ({
            getRequest: () => request,
            getResponse: () => ({}),
        }),
        getHandler: () => vi.fn(),
        getClass: () => vi.fn(),
        getType: () => 'http' as const,
        getArgs: () => [request],
        getArgByIndex: () => undefined,
        switchToRpc: () => ({} as any),
        switchToWs: () => ({} as any),
    } as unknown as ExecutionContext;
}

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('AuditInterceptor', () => {
    let interceptor: AuditInterceptor;
    let auditService: { log: ReturnType<typeof vi.fn> };
    let callHandler: CallHandler;

    beforeEach(() => {
        auditService = {
            log: vi.fn().mockResolvedValue(undefined),
        };
        interceptor = new AuditInterceptor(auditService as any);
    });

    it('should NOT intercept GET requests', async () => {
        const ctx = createMockContext('GET');
        callHandler = { handle: () => of({ data: 'result' }) };

        const result = await lastValueFrom(
            interceptor.intercept(ctx, callHandler),
        );

        expect(result).toEqual({ data: 'result' });
        expect(auditService.log).not.toHaveBeenCalled();
    });

    it('should intercept POST and log audit entry', async () => {
        const user = {
            sub: 'user-123',
            companyScope: 'AvantElite',
        };
        const body = { nombre: 'Test Order' };
        const responseBody = { id: 'order-456', nombre: 'Test Order' };

        const ctx = createMockContext('POST', body, user, {}, '/work-orders');
        callHandler = { handle: () => of(responseBody) };

        await lastValueFrom(interceptor.intercept(ctx, callHandler));
        await delay(100);

        expect(auditService.log).toHaveBeenCalledWith(
            expect.objectContaining({
                accion: 'CREATE',
                userId: 'user-123',
                companyScope: 'AvantElite',
                beforeJson: body,
                afterJson: responseBody,
                tabla: 'work-orders',
                recordId: 'order-456',
            }),
        );
    });

    it('should intercept PUT and log UPDATE action', async () => {
        const user = { sub: 'user-789', companyScope: 'AvantService' };
        const body = { estado: 'completada' };
        const responseBody = { id: 'order-456', estado: 'completada' };

        const ctx = createMockContext(
            'PUT',
            body,
            user,
            { id: 'order-456' },
            '/work-orders/order-456',
        );
        callHandler = { handle: () => of(responseBody) };

        await lastValueFrom(interceptor.intercept(ctx, callHandler));
        await delay(100);

        expect(auditService.log).toHaveBeenCalledWith(
            expect.objectContaining({
                accion: 'UPDATE',
                recordId: 'order-456',
            }),
        );
    });

    it('should intercept DELETE and log DELETE action', async () => {
        const user = { sub: 'admin-1', companyScope: 'AvantElite' };

        const ctx = createMockContext(
            'DELETE',
            {},
            user,
            { id: 'item-999' },
            '/inventory/item-999',
        );
        callHandler = { handle: () => of({ deleted: true }) };

        await lastValueFrom(interceptor.intercept(ctx, callHandler));
        await delay(100);

        expect(auditService.log).toHaveBeenCalledWith(
            expect.objectContaining({
                accion: 'DELETE',
                recordId: 'item-999',
            }),
        );
    });

    it('should handle audit failures gracefully without breaking the response', async () => {
        auditService.log.mockRejectedValue(new Error('DB connection lost'));

        const user = { sub: 'user-1', companyScope: 'AvantElite' };
        const ctx = createMockContext('POST', {}, user);
        const responseBody = { id: '1', success: true };
        callHandler = { handle: () => of(responseBody) };

        const result = await lastValueFrom(
            interceptor.intercept(ctx, callHandler),
        );

        // Response returned even if audit fails
        expect(result).toEqual(responseBody);
    });
});
