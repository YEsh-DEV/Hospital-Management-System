import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  /**
   * Send a password reset email via Resend API.
   * Falls back gracefully if RESEND_API_KEY is not configured.
   */
  async sendPasswordResetEmail(
    email: string,
    fullName: string,
    rawToken: string,
  ): Promise<void> {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}`;
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey || apiKey.startsWith('re_demo')) {
      // Development fallback: log the link instead of sending
      this.logger.warn(
        `[DEV MODE] Password reset for ${email}: ${resetUrl}`,
      );
      return;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: 'HMS Noreply <noreply@hospitalmanagementsystem.demo>',
          to: email,
          subject: 'Reset Your HMS Password',
          html: this.buildResetEmailHtml(fullName, resetUrl),
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.error(`Resend API error: ${response.status} — ${text}`);
      }
    } catch (err) {
      this.logger.error('Failed to send reset email', err);
    }
  }

  private buildResetEmailHtml(fullName: string, resetUrl: string): string {
    return `
<!DOCTYPE html>
<html>
  <body style="font-family: Inter, sans-serif; background: #F8FAFC; padding: 32px;">
    <div style="max-width: 480px; margin: 0 auto; background: white; border: 1px solid #E2E8F0; border-radius: 8px; padding: 32px;">
      <h2 style="color: #0F172A; font-size: 20px; margin-bottom: 8px;">Reset Your Password</h2>
      <p style="color: #64748B; font-size: 14px;">Hi ${fullName},</p>
      <p style="color: #64748B; font-size: 14px;">
        You requested a password reset for your HMS account. Click the link below to reset it.
        This link expires in <strong>60 minutes</strong> and can only be used once.
      </p>
      <a href="${resetUrl}"
         style="display: inline-block; background: #0284C7; color: white; text-decoration: none;
                padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; margin: 16px 0;">
        Reset Password →
      </a>
      <p style="color: #94A3B8; font-size: 12px; margin-top: 24px;">
        If you didn't request this, you can safely ignore this email.
        All active sessions will be terminated upon reset.
      </p>
      <p style="color: #CBD5E1; font-size: 11px;">
        Protected by HIPAA &amp; GDPR Compliance Rules
      </p>
    </div>
  </body>
</html>`;
  }
}
