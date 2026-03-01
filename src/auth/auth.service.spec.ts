import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '@/prisma/prisma.service';
import * as argon2 from 'argon2';

// Mock user data
const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'admin@avantelite.com',
    passwordHash: '', // will be set in beforeEach
    nombre: 'Admin AvantElite',
    companyScope: 'AvantElite',
    refreshTokenHash: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    userRoles: [
        {
            id: '1',
            userId: '550e8400-e29b-41d4-a716-446655440000',
            roleId: '1',
            role: {
                id: '1',
                nombre: 'ADMINISTRADOR',
                rolePermissions: [
                    {
                        id: '1',
                        roleId: '1',
                        permissionId: '1',
                        scope: 'ALL',
                        permission: {
                            id: '1',
                            key: 'work-orders.create',
                            scope: 'ALL',
                        },
                    },
                ],
            },
        },
    ],
};

describe('AuthService', () => {
    let authService: AuthService;
    let prismaService: any;
    let jwtService: any;

    beforeEach(async () => {
        // Hash the password for the mock user
        mockUser.passwordHash = await argon2.hash('correct-password');

        prismaService = {
            user: {
                findUnique: vi.fn(),
                update: vi.fn(),
            },
        };

        jwtService = {
            signAsync: vi.fn().mockResolvedValue('mock-token'),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: PrismaService, useValue: prismaService },
                { provide: JwtService, useValue: jwtService },
                {
                    provide: ConfigService,
                    useValue: {
                        get: vi.fn((key: string) => {
                            const config: Record<string, string> = {
                                JWT_SECRET: 'test-jwt-secret-at-least-32-characters',
                                JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-characters',
                                JWT_EXPIRATION: '15m',
                                REFRESH_EXPIRATION: '7d',
                            };
                            return config[key];
                        }),
                    },
                },
            ],
        }).compile();

        authService = module.get<AuthService>(AuthService);
    });

    describe('login', () => {
        it('should return tokens on correct credentials', async () => {
            prismaService.user.findUnique.mockResolvedValue(mockUser);
            prismaService.user.update.mockResolvedValue(mockUser);

            const result = await authService.login(
                'admin@avantelite.com',
                'correct-password',
            );

            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result.accessToken).toBe('mock-token');
            expect(prismaService.user.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { email: 'admin@avantelite.com', deletedAt: null },
                }),
            );
        });

        it('should throw UnauthorizedException on wrong password', async () => {
            prismaService.user.findUnique.mockResolvedValue(mockUser);

            await expect(
                authService.login('admin@avantelite.com', 'wrong-password'),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException on non-existent email', async () => {
            prismaService.user.findUnique.mockResolvedValue(null);

            await expect(
                authService.login('nonexistent@example.com', 'any-password'),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should store hashed refresh token after login', async () => {
            prismaService.user.findUnique.mockResolvedValue(mockUser);
            prismaService.user.update.mockResolvedValue(mockUser);

            await authService.login('admin@avantelite.com', 'correct-password');

            expect(prismaService.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: mockUser.id },
                    data: expect.objectContaining({
                        refreshTokenHash: expect.any(String),
                    }),
                }),
            );
        });
    });

    describe('logout', () => {
        it('should clear the refresh token hash', async () => {
            prismaService.user.update.mockResolvedValue(mockUser);

            await authService.logout(mockUser.id);

            expect(prismaService.user.update).toHaveBeenCalledWith({
                where: { id: mockUser.id },
                data: { refreshTokenHash: null },
            });
        });
    });

    describe('refresh', () => {
        it('should throw if user has no refresh token stored', async () => {
            prismaService.user.findUnique.mockResolvedValue({
                ...mockUser,
                refreshTokenHash: null,
            });

            await expect(
                authService.refresh(mockUser.id, 'any-token'),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should rotate tokens if refresh token is valid', async () => {
            const refreshToken = 'valid-refresh-token';
            const refreshHash = await argon2.hash(refreshToken);

            prismaService.user.findUnique.mockResolvedValue({
                ...mockUser,
                refreshTokenHash: refreshHash,
            });
            prismaService.user.update.mockResolvedValue(mockUser);

            const result = await authService.refresh(mockUser.id, refreshToken);

            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
        });

        it('should revoke session if refresh token is invalid', async () => {
            const refreshHash = await argon2.hash('real-token');

            prismaService.user.findUnique.mockResolvedValue({
                ...mockUser,
                refreshTokenHash: refreshHash,
            });
            prismaService.user.update.mockResolvedValue(mockUser);

            await expect(
                authService.refresh(mockUser.id, 'stolen-token'),
            ).rejects.toThrow(UnauthorizedException);

            // Should clear the refresh token on possible theft
            expect(prismaService.user.update).toHaveBeenCalledWith({
                where: { id: mockUser.id },
                data: { refreshTokenHash: null },
            });
        });
    });
});
