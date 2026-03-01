import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TenantMiddleware } from './tenant.middleware';
import { PrismaModule } from '@/prisma';

@Module({
    imports: [PrismaModule],
    providers: [TenantMiddleware],
    exports: [TenantMiddleware],
})
export class MultitenancyModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(TenantMiddleware).forRoutes('*');
    }
}
