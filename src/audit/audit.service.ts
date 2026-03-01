import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface AuditLogEntry {
    tabla: string;
    recordId: string;
    accion: string;
    beforeJson: any;
    afterJson: any;
    userId: string;
    ip: string | null;
    deviceId: string | null;
    geoJson: any;
    companyScope: string;
    approvalRequestId?: string;
}

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Write an audit log entry.
     */
    async log(entry: AuditLogEntry): Promise<void> {
        try {
            await this.prisma.auditLog.create({
                data: {
                    tabla: entry.tabla,
                    recordId: entry.recordId,
                    accion: entry.accion,
                    beforeJson: entry.beforeJson,
                    afterJson: entry.afterJson,
                    userId: entry.userId,
                    ip: entry.ip,
                    deviceId: entry.deviceId,
                    geoJson: entry.geoJson,
                    companyScope: entry.companyScope,
                    approvalRequestId: entry.approvalRequestId || null,
                },
            });
        } catch (error) {
            this.logger.error('Failed to create audit log', error);
            // Re-throw so interceptor can handle
            throw error;
        }
    }

    /**
     * Query audit logs for a specific record.
     */
    async findByRecord(tabla: string, recordId: string) {
        return this.prisma.auditLog.findMany({
            where: { tabla, recordId },
            orderBy: { createdAt: 'desc' },
        });
    }
}
