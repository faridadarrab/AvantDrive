import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(config: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.get<string>('JWT_SECRET'),
        });
    }

    /**
     * Passport calls this after verifying the JWT signature & expiration.
     * Returned object is attached to request.user.
     */
    validate(payload: JwtPayload): JwtPayload {
        if (!payload.sub) {
            throw new UnauthorizedException('Token inválido');
        }
        return payload;
    }
}
