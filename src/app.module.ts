import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ClsModule } from 'nestjs-cls';
import { PrismaModule } from './prisma';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit';
import { MultitenancyModule } from './multitenancy';
import { DocSeriesModule } from './doc-series';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionGuard } from './auth/guards/permission.guard';
import { FleetModule } from './fleet/fleet.module';
import { MaterialsModule } from './materials/materials.module';
import { SatModule } from './sat/sat.module';
import { SalesModule } from './sales/sales.module';
import { CashModule } from './cash/cash.module';
import { CrmModule } from './crm/crm.module';

@Module({
    imports: [
        // Global config from .env
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env', '.env.local'],
        }),

        // CLS (AsyncLocalStorage) for multitenancy context
        ClsModule.forRoot({
            global: true,
            middleware: {
                mount: true,
            },
        }),

        // Core infrastructure
        PrismaModule,
        AuditModule,
        MultitenancyModule,

        // Feature modules
        AuthModule,
        DocSeriesModule,
        FleetModule,
        MaterialsModule,
        SatModule,
        SalesModule,
        CashModule,
        CrmModule,
    ],

    providers: [
        // Global JWT auth guard — all routes require auth unless @Public()
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
        // Global permission guard — checks @HasPermission() metadata
        {
            provide: APP_GUARD,
            useClass: PermissionGuard,
        },
    ],
})
export class AppModule { }
