import { authenticator } from 'otplib';
import crypto from 'crypto';
import { getConfig } from '../../../config/index.js';

// Configure otplib
authenticator.options = {
  window: 1, // Allow 1 step before/after for clock drift
};

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function generateTotpUri(email: string, secret: string): string {
  return authenticator.keyuri(email, 'TradePulse', secret);
}

export function verifyTotpCode(secret: string, code: string): boolean {
  try {
    return authenticator.verify({ token: code, secret });
  } catch {
    return false;
  }
}

// Encrypt TOTP secret before storing in DB
export function encryptSecret(secret: string): string {
  const config = getConfig();
  const key = crypto.scryptSync(config.JWT_SECRET, 'totp-salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

// Decrypt TOTP secret from DB
export function decryptSecret(encryptedData: string): string {
  const config = getConfig();
  const parts = encryptedData.split(':');
  const ivHex = parts[0];
  const authTagHex = parts[1];
  const encrypted = parts[2];

  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('Invalid encrypted data format');
  }

  const key = crypto.scryptSync(config.JWT_SECRET, 'totp-salt', 32);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
