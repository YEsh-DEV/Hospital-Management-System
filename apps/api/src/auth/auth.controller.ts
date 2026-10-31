import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard, JwtAuthGuard } from './guards/auth.guard';
import { Roles, RolesGuard } from '../rbac/rbac.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LoginDto, ForgotPasswordDto, ResetPasswordDto, SwitchRoleDto } from './dto/auth.dto';
import { EmailService } from '../email/email.service';
import { Throttle } from '@nestjs/throttler';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(EmailService) private readonly emailService: EmailService,
  ) {}

  // ─── POST /auth/login ─────────────────────────────────────────────────────
  @UseGuards(LocalAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: LoginDto,
  ) {
    const user = req.user as any;
    const ip = req.ip;
    const ua = req.headers['user-agent'];
    const { accessToken, refreshToken } = await this.authService.login(
      user,
      dto.rememberMe,
      ip,
      ua,
    );

    const maxAge = dto.rememberMe ? 8 * 60 * 60 * 1000 : undefined;

    res.cookie('access_token', accessToken, { ...COOKIE_OPTS, maxAge });
    res.cookie('refresh_token', refreshToken, { ...COOKIE_OPTS, maxAge });

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role?.name,
        permissions: user.role?.permissions?.map((rp: any) => rp.permission.action) ?? [],
      },
    };
  }

  // ─── POST /auth/refresh ───────────────────────────────────────────────────
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body('refreshToken') bodyRefreshToken?: string,
  ) {
    const refreshTokenRaw = req.cookies?.['refresh_token'] || bodyRefreshToken;
    const { tokens, user } = await this.authService.refresh(
      refreshTokenRaw,
      req.ip,
      req.headers['user-agent'],
    );

    res.cookie('access_token', tokens.accessToken, COOKIE_OPTS);
    res.cookie('refresh_token', tokens.refreshToken, COOKIE_OPTS);

    return {
      message: 'Tokens refreshed successfully',
      user,
      accessToken: tokens.accessToken,
    };
  }

  // ─── POST /auth/logout ────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: any,
  ) {
    const refreshToken = req.cookies?.['refresh_token'];
    await this.authService.logout(user.id, refreshToken, req.ip, req.headers['user-agent']);

    res.clearCookie('access_token', COOKIE_OPTS);
    res.clearCookie('refresh_token', COOKIE_OPTS);

    return { message: 'Logged out successfully' };
  }

  // ─── GET /auth/me ─────────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  getMe(@CurrentUser() user: any) {
    return { user };
  }

  // ─── POST /auth/forgot-password ───────────────────────────────────────────
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 per minute
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: Request,
  ) {
    const result = await this.authService.forgotPassword(
      dto.email,
      req.ip,
      req.headers['user-agent'],
    );

    if (result) {
      // Fire-and-forget email — never expose rawToken in response
      this.emailService.sendPasswordResetEmail(result.user.email, result.user.fullName, result.rawToken).catch(() => {});
    }

    // Always return same message (prevents email enumeration)
    return { message: 'If an account exists for that email, a reset link has been sent.' };
  }

  // ─── POST /auth/reset-password ────────────────────────────────────────────
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.resetPassword(
      dto.token,
      dto.newPassword,
      req.ip,
      req.headers['user-agent'],
    );

    // Clear any existing session cookies after reset
    res.clearCookie('access_token', COOKIE_OPTS);
    res.clearCookie('refresh_token', COOKIE_OPTS);

    return { message: 'Password reset successfully. All active sessions have been terminated.' };
  }

  // ─── POST /auth/switch-role (Demo Only) ───────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('switch-role')
  @HttpCode(HttpStatus.OK)
  async switchRole(
    @Body() dto: SwitchRoleDto,
    @CurrentUser() user: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.switchRole(
      user.id,
      dto.role,
      req.ip,
    );

    res.cookie('access_token', accessToken, COOKIE_OPTS);
    res.cookie('refresh_token', refreshToken, COOKIE_OPTS);

    return { message: `Demo: role switched to ${dto.role}`, role: dto.role };
  }

  // ─── POST /auth/ai-token (Scoped JWT for AI Voice Receptionist) ───────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post('ai-token')
  @HttpCode(HttpStatus.OK)
  generateAiServiceToken() {
    return this.authService.generateAiServiceToken();
  }
}
