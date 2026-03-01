import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { JwtPayload } from '../interfaces';

function createMockContext(user: JwtPayload | null): ExecutionContext {
    return {
        switchToHttp: () => ({
            getRequest: () => ({ user }),
            getResponse: () => ({}),
            getNext: () => ({}),
        }),
        getHandler: () => vi.fn(),
        getClass: () => vi.fn(),
        getType: () => 'http' as const,
        getArgs: () => [],
        getArgByIndex: () => undefined,
        switchToRpc: () => ({} as any),
        switchToWs: () => ({} as any),
    } as unknown as ExecutionContext;
}

describe('PermissionGuard', () => {
    let guard: PermissionGuard;
    let reflector: Reflector;

    beforeEach(() => {
        reflector = new Reflector();
        guard = new PermissionGuard(reflector);
    });

    it('should allow access when no @HasPermission is set', () => {
        vi.spyOn(reflector, 'getAllAndOverride')
            .mockReturnValueOnce(false)    // isPublic
            .mockReturnValueOnce(undefined); // no permission required

        const user: JwtPayload = {
            sub: '1',
            email: 'admin@test.com',
            companyScope: 'AvantElite',
            roles: ['ADMINISTRADOR'],
            permissions: [{ key: 'work-orders.create', scope: 'ALL' }],
        };

        const ctx = createMockContext(user);
        expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should allow access when user has sufficient scope (ALL >= COMPANY)', () => {
        vi.spyOn(reflector, 'getAllAndOverride')
            .mockReturnValueOnce(false) // isPublic
            .mockReturnValueOnce({ key: 'work-orders.create', scope: 'COMPANY' }); // required

        const user: JwtPayload = {
            sub: '1',
            email: 'admin@test.com',
            companyScope: 'AvantElite',
            roles: ['ADMINISTRADOR'],
            permissions: [{ key: 'work-orders.create', scope: 'ALL' }],
        };

        const ctx = createMockContext(user);
        expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should DENY access when user scope is LOWER than required (OWN < ALL)', () => {
        vi.spyOn(reflector, 'getAllAndOverride')
            .mockReturnValueOnce(false) // isPublic
            .mockReturnValueOnce({ key: 'work-orders.create', scope: 'ALL' }); // required

        const user: JwtPayload = {
            sub: '2',
            email: 'tech@test.com',
            companyScope: 'AvantService',
            roles: ['REPARADOR_DOMICILIO'],
            permissions: [{ key: 'work-orders.create', scope: 'OWN' }],
        };

        const ctx = createMockContext(user);
        expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('should DENY access when user has no matching permission key', () => {
        vi.spyOn(reflector, 'getAllAndOverride')
            .mockReturnValueOnce(false) // isPublic
            .mockReturnValueOnce({ key: 'admin.users.delete', scope: 'ALL' }); // required

        const user: JwtPayload = {
            sub: '3',
            email: 'sales@test.com',
            companyScope: 'AvantStore',
            roles: ['VENTAS_TIENDA'],
            permissions: [{ key: 'sales.create', scope: 'COMPANY' }],
        };

        const ctx = createMockContext(user);
        expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('should allow access on @Public() routes', () => {
        vi.spyOn(reflector, 'getAllAndOverride')
            .mockReturnValueOnce(true); // isPublic

        const ctx = createMockContext(null);
        expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should allow exact scope match (COMPANY == COMPANY)', () => {
        vi.spyOn(reflector, 'getAllAndOverride')
            .mockReturnValueOnce(false) // isPublic
            .mockReturnValueOnce({ key: 'work-orders.update', scope: 'COMPANY' }); // required

        const user: JwtPayload = {
            sub: '4',
            email: 'admin2@test.com',
            companyScope: 'AvantService',
            roles: ['ADMINISTRACION'],
            permissions: [{ key: 'work-orders.update', scope: 'COMPANY' }],
        };

        const ctx = createMockContext(user);
        expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should DENY when user scope is READONLY but endpoint requires OWN', () => {
        vi.spyOn(reflector, 'getAllAndOverride')
            .mockReturnValueOnce(false) // isPublic
            .mockReturnValueOnce({ key: 'work-orders.update', scope: 'OWN' }); // required

        const user: JwtPayload = {
            sub: '5',
            email: 'gerencia@test.com',
            companyScope: 'AvantElite',
            roles: ['GERENCIA_LECTURA'],
            permissions: [{ key: 'work-orders.update', scope: 'READONLY' }],
        };

        const ctx = createMockContext(user);
        expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
});
