import { IsEmail, IsString, MinLength, IsBoolean, IsOptional, IsIn } from 'class-validator';

// Human-facing login roles only — AI_SERVICE is excluded from human login
const HUMAN_LOGIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'] as const;
export type HumanLoginRole = typeof HUMAN_LOGIN_ROLES[number];

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  // Role is optional — resolved from the user's DB record on the server.
  // Sending a role is accepted for backwards-compatibility but is no longer required.
  @IsOptional()
  @IsIn(HUMAN_LOGIN_ROLES, {
    message: 'Invalid role selected. AI_SERVICE cannot be used as a human login role.',
  })
  role?: HumanLoginRole;

  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  newPassword: string;
}

export class SwitchRoleDto {
  @IsString()
  role: string;
}
