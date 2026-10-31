/**
 * Generates an authoritative, scoped JWT token for the AI Voice Receptionist service
 * using Node's native 'crypto' module (zero external dependencies).
 * Permissions granted: 'availability:read', 'booking:create', 'call:manage'.
 * 
 * Usage:
 *   npx tsx scripts/generate-ai-token.ts
 *   or: node -e "require('tsx'); require('./scripts/generate-ai-token.ts')"
 */

import * as crypto from 'crypto';

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function generateAiToken() {
  const secret = process.env.JWT_SECRET || 'advfiction_jwt_secret_dev_2026_super_secure';
  
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: 'ai_voice_service_machine',
    email: 'ai-voice@service.internal',
    role: 'AI_SERVICE',
    permissions: ['availability:read', 'booking:create', 'call:manage'],
    type: 'access',
    iss: 'HMS_API_AUTH_SERVICE',
    iat: now,
    exp: now + 365 * 24 * 60 * 60, // 365 days
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(signatureInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const token = `${signatureInput}.${signature}`;

  console.log('\n======================================================');
  console.log('🤖 AI VOICE RECEPTIONIST SERVICE TOKEN GENERATED');
  console.log('======================================================');
  console.log('Role: AI_SERVICE');
  console.log('Permissions: availability:read, booking:create, call:manage');
  console.log('Expires: 365 days');
  console.log('\nJWT TOKEN:');
  console.log(token);
  console.log('\nConfigure in ai-voice-receptionist/.env:');
  console.log(`HMS_API_KEY=${token}`);
  console.log(`HMS_BASE_URL=http://localhost:4000`);
  console.log(`HMS_PATH_PREFIX=/api`);
  console.log('======================================================\n');
}

generateAiToken();
