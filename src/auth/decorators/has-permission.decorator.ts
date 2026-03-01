import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'requiredPermission';

export interface PermissionMetadata {
    key: string;   // e.g. "work-orders.create"
    scope: string; // ScopeType: ALL | COMPANY | OWN | READONLY
}

/**
 * Decorates an endpoint with a required permission key and scope.
 * Used by PermissionGuard to enforce RBAC.
 *
 * @example @HasPermission('work-orders.create', 'COMPANY')
 */
export const HasPermission = (key: string, scope: string) =>
    SetMetadata(PERMISSION_KEY, { key, scope } as PermissionMetadata);
