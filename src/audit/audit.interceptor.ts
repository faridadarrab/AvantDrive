import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';
import { JwtPayload } from '@/auth/interfaces';

/**
 * Global interceptor that captures ALL mutations (POST, PATCH, PUT, DELETE)
 * and writes an AuditLog record.
 *
 * Registered in main.ts with app.useGlobalInterceptors().
 * Rule R9: 100% de mutaciones capturadas, sin excepciones.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
    private readonly logger = new Logger(AuditInterceptor.name);

    private static readonly MUTATION_METHODS = new Set([
        'POST',
        'PATCH',
        'PUT',
        'DELETE',
    ]);

    constructor(private readonly auditService: AuditService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const method: string = request.method?.toUpperCase();

        if (!AuditInterceptor.MUTATION_METHODS.has(method)) {
            return next.handle();
        }

        const user: JwtPayload | undefined = request.user;
        const beforeJson = request.body ? { ...request.body } : null;
        const ip =
            request.ip ||
            request.headers['x-forwarded-for'] ||
            request.connection?.remoteAddress;
        const deviceId = request.headers['x-device-id'] || null;
        const geoJson = request.headers['x-geo-json']
            ? JSON.parse(request.headers['x-geo-json'])
            : null;

        const routePath = request.routeOptions?.url || request.url || '';
        const accion = this.methodToAction(method);

        return next.handle().pipe(
            tap({
                next: async (responseBody) => {
                    try {
                        // Extract table name and record ID from the route
                        const { tabla, recordId } = this.extractRouteInfo(
                            routePath,
                            request.params,
                            responseBody,
                        );

                        await this.auditService.log({
                            tabla,
                            recordId: recordId || 'unknown',
                            accion,
                            beforeJson,
                            afterJson: responseBody || null,
                            userId: user?.sub || 'anonymous',
                            ip: ip || null,
                            deviceId,
                            geoJson,
                            companyScope: user?.companyScope || 'unknown',
                        });
                    } catch (err) {
                        // Never let audit failures break the response
                        this.logger.error('Failed to write audit log', err);
                    }
                },
            }),
        );
    }

    private methodToAction(method: string): string {
        switch (method) {
            case 'POST':
                return 'CREATE';
            case 'PATCH':
            case 'PUT':
                return 'UPDATE';
            case 'DELETE':
                return 'DELETE';
            default:
                return method;
        }
    }

    private extractRouteInfo(
        routePath: string,
        params: Record<string, string>,
        responseBody: any,
    ): { tabla: string; recordId: string } {
        // Extract the resource name from the route (first segment after /)
        const segments = routePath.split('/').filter(Boolean);
        const tabla = segments[0] || 'unknown';
        const recordId =
            params?.id || responseBody?.id || 'unknown';

        return { tabla, recordId };
    }
}
