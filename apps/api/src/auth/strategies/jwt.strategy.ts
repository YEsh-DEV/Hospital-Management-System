import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  sub: string;      // user id
  email: string;
  role: string;
  permissions: string[];
  type: 'access' | 'refresh';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(UsersService) private usersService: UsersService) {
    super({
      // Extract JWT from HttpOnly cookie OR Authorization header (for AI service)
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['access_token'] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'changeme',
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.role === 'AI_SERVICE') {
      return {
        id: payload.sub,
        email: payload.email,
        fullName: 'AI Voice Receptionist (Service)',
        role: 'AI_SERVICE',
        permissions: payload.permissions || ['availability:read', 'booking:create'],
      };
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found or deactivated');

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role.name,
      permissions: user.role.permissions.map((rp) => rp.permission.action),
    };
  }
}
