import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(AuthService) private authService: AuthService) {
    super({
      usernameField: 'email',
      passReqToCallback: true,
    });
  }

  async validate(req: any, email: string, password: string) {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials or account not authorized.');
    }

    // Block AI_SERVICE from using the human login portal
    if (user.role?.name === 'AI_SERVICE') {
      throw new UnauthorizedException('AI Service accounts cannot use the human login portal.');
    }

    return user;
  }
}
