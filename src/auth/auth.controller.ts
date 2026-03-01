import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto } from './dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtPayload } from './interfaces';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly jwtService: JwtService,
        private readonly config: ConfigService,
    ) { }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login con email + password' })
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto.email, dto.password);
    }

    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Rotar refresh token' })
    async refresh(@Body() dto: RefreshDto) {
        try {
            const decoded = this.jwtService.verify<{ sub: string }>(
                dto.refreshToken,
                { secret: this.config.get<string>('JWT_REFRESH_SECRET') },
            );
            return this.authService.refresh(decoded.sub, dto.refreshToken);
        } catch {
            throw new UnauthorizedException('Refresh token inválido o expirado');
        }
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cerrar sesión (invalidar refresh token)' })
    async logout(@CurrentUser() user: JwtPayload) {
        await this.authService.logout(user.sub);
        return { message: 'Sesión cerrada' };
    }
}
