import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';
import { PrismaModule } from '@/prisma';

@Global()
@Module({
    imports: [PrismaModule],
    providers: [AuditService, AuditInterceptor],
    exports: [AuditService, AuditInterceptor],
})
export class AuditModule { }
