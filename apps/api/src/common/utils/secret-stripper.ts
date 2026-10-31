/**
 * Secret / Credential Stripper
 *
 * Recursively removes sensitive keys from any object before it is written
 * to the audit_logs table (oldValues / newValues JSON columns) or emitted
 * in any interceptor payload.
 *
 * Keys matched case-insensitively. Add more patterns as needed.
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'passwordconfirm',
  'confirmpassword',
  'currentpassword',
  'newpassword',
  'secret',
  'tokenhash',
  'token',
  'refreshtoken',
  'accesstoken',
  'authorization',
  'apikey',
  'api_key',
  'private_key',
  'privatekey',
  'pepper',
  'salt',
  'otp',
  'pin',
  'ssn',
  'cvv',
  'cardnumber',
]);

const REDACTED = '[REDACTED]';

export function stripSecrets<T>(value: T): T {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map(stripSecrets) as unknown as T;
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        result[k] = REDACTED;
      } else {
        result[k] = stripSecrets(v);
      }
    }
    return result as T;
  }

  return value;
}
