import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
    PERMISSION_KEY,
    PermissionMetadata,
} from '../decorators/has-permission.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload, PermissionEntry } from '../interfaces';

/**
 * Guard that checks whether the current user has the required
 * permission key + scope level.
 *
 * Scope hierarchy: ALL > COMPANY > OWN > READONLY
 * A user with ALL scope can access endpoints requiring COMPANY or OWN.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
    private static readonly SCOPE_HIERARCHY: Record<string, number> = {
        ALL: 4,
        COMPANY: 3,
        OWN: 2,
        READONLY: 1,
    };

    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;

        const required = this.reflector.getAllAndOverride<PermissionMetadata>(
            PERMISSION_KEY,
            [context.getHandler(), context.getClass()],
        );

        // No @HasPermission decorator → allow (only JWT required)
        if (!required) return true;

        const request = context.switchToHttp().getRequest();
        const user: JwtPayload = request.user;

        if (!user || !user.permissions) {
            throw new ForbiddenException('No autenticado o sin permisos');
        }

        const userPerm = user.permissions.find(
            (p: PermissionEntry) => p.key === required.key,
        );

        if (!userPerm) {
            throw new ForbiddenException(
                `Permiso requerido: ${required.key}`,
            );
        }

        const userLevel =
            PermissionGuard.SCOPE_HIERARCHY[userPerm.scope] ?? 0;
        const requiredLevel =
            PermissionGuard.SCOPE_HIERARCHY[required.scope] ?? 0;

        if (userLevel < requiredLevel) {
            throw new ForbiddenException(
                `Scope insuficiente: tiene ${userPerm.scope}, necesita ${required.scope}`,
            );
        }

        return true;
    }
}
