import {
    Injectable,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtPayload, TokenPair, PermissionEntry } from './interfaces';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly config: ConfigService,
    ) { }

    /**
     * Authenticate user with email + password (argon2).
     * Returns accessToken (15min) + refreshToken (7d).
     */
    async login(email: string, password: string): Promise<TokenPair> {
        const user = await this.prisma.user.findUnique({
            where: { email, deletedAt: null },
            include: {
                userRoles: {
                    include: {
                        role: {
                            include: {
                                rolePermissions: {
                                    include: { permission: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        const isPasswordValid = await argon2.verify(user.passwordHash, password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        const tokens = await this.generateTokens(user);

        // Store hashed refresh token
        const refreshHash = await argon2.hash(tokens.refreshToken);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { refreshTokenHash: refreshHash },
        });

        this.logger.log(`User ${user.email} logged in`);
        return tokens;
    }

    /**
     * Rotate the refresh token: validate old one, issue new pair.
     */
    async refresh(userId: string, refreshToken: string): Promise<TokenPair> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId, deletedAt: null },
            include: {
                userRoles: {
                    include: {
                        role: {
                            include: {
                                rolePermissions: {
                                    include: { permission: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!user || !user.refreshTokenHash) {
            throw new UnauthorizedException('Sesión inválida');
        }

        const isRefreshValid = await argon2.verify(
            user.refreshTokenHash,
            refreshToken,
        );
        if (!isRefreshValid) {
            // Possible token theft — invalidate all sessions
            await this.prisma.user.update({
                where: { id: userId },
                data: { refreshTokenHash: null },
            });
            throw new UnauthorizedException('Refresh token inválido — sesión revocada');
        }

        const tokens = await this.generateTokens(user);

        // Rotate: store new hash
        const newRefreshHash = await argon2.hash(tokens.refreshToken);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { refreshTokenHash: newRefreshHash },
        });

        return tokens;
    }

    /**
     * Logout: clear the refresh token hash.
     */
    async logout(userId: string): Promise<void> {
        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshTokenHash: null },
        });
        this.logger.log(`User ${userId} logged out`);
    }

    /**
     * Generate access + refresh token pair.
     */
    private async generateTokens(user: any): Promise<TokenPair> {
        const roles = user.userRoles.map(
            (ur: any) => ur.role.nombre,
        );

        const permissionsMap = new Map<string, string>();
        for (const ur of user.userRoles) {
            for (const rp of ur.role.rolePermissions) {
                const existing = permissionsMap.get(rp.permission.key);
                // Keep the most permissive scope
                if (!existing || this.scopePriority(rp.scope) > this.scopePriority(existing)) {
                    permissionsMap.set(rp.permission.key, rp.scope);
                }
            }
        }

        const permissions: PermissionEntry[] = Array.from(
            permissionsMap.entries(),
        ).map(([key, scope]) => ({ key, scope }));

        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            companyScope: user.companyScope,
            roles,
            permissions,
        };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.config.get<string>('JWT_SECRET'),
                expiresIn: this.config.get<string>('JWT_EXPIRATION', '15m'),
            }),
            this.jwtService.signAsync(
                { sub: user.id, type: 'refresh' },
                {
                    secret: this.config.get<string>('JWT_REFRESH_SECRET'),
                    expiresIn: this.config.get<string>('REFRESH_EXPIRATION', '7d'),
                },
            ),
        ]);

        return { accessToken, refreshToken };
    }

    private scopePriority(scope: string): number {
        const order: Record<string, number> = {
            ALL: 4,
            COMPANY: 3,
            OWN: 2,
            READONLY: 1,
        };
        return order[scope] ?? 0;
    }
}
