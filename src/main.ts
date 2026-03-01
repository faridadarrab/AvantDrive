import { NestFactory } from '@nestjs/core';
import {
    FastifyAdapter,
    NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AuditInterceptor } from './audit';
import { AuditService } from './audit';
import { PrismaService } from './prisma';
import { prismaTenantMiddleware } from './multitenancy';

async function bootstrap() {
    const logger = new Logger('Bootstrap');

    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter({ logger: false }),
    );

    // ─── Global prefix ─────────────────────────────────────────
    app.setGlobalPrefix('api');

    // ─── CORS (restricted in production) ────────────────────────
    app.enableCors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
        credentials: true,
    });

    // ─── Global validation pipe ─────────────────────────────────
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    // ─── Global audit interceptor (Rule R9) ─────────────────────
    const auditService = app.get(AuditService);
    app.useGlobalInterceptors(new AuditInterceptor(auditService));

    // ─── Prisma tenant middleware (Rule R10) ─────────────────────
    const prismaService = app.get(PrismaService);
    prismaService.$use(prismaTenantMiddleware());

    // ─── Swagger / OpenAPI ──────────────────────────────────────
    const swaggerConfig = new DocumentBuilder()
        .setTitle('AvantDrive ERP API')
        .setDescription('API para el sistema ERP/CRM/SAT multi-empresa')
        .setVersion('1.0')
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);

    // ─── Start ──────────────────────────────────────────────────
    const port = process.env.PORT || 3000;
    await app.listen(port, '0.0.0.0');
    logger.log(`🚀 AvantDrive ERP API running on port ${port}`);
    logger.log(`📚 Swagger UI: http://localhost:${port}/api/docs`);
}

bootstrap();
