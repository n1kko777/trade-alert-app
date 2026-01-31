import { query, queryOne, execute } from '../../db/queries/index.js';
import { hashPassword, verifyPassword } from '../../utils/crypto.js';
import { ConflictError, AuthError, NotFoundError, ValidationError } from '../../utils/errors.js';
import { RegisterInput, LoginInput } from './auth.schema.js';
import {
  generateTotpSecret,
  generateTotpUri,
  encryptSecret,
  decryptSecret,
  verifyTotpCode,
} from './strategies/totp.strategy.js';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  subscription: 'free' | 'pro' | 'premium' | 'vip';
  subscription_expires_at: Date | null;
  totp_secret: string | null;
  totp_enabled: boolean;
  is_blocked: boolean;
  created_at: Date;
  updated_at: Date;
}

export type SafeUser = Omit<User, 'password_hash' | 'totp_secret'>;

export async function register(input: RegisterInput): Promise<SafeUser> {
  // Check if user exists
  const existing = await queryOne<User>(
    'SELECT id FROM users WHERE email = $1',
    [input.email.toLowerCase()]
  );

  if (existing) {
    throw new ConflictError('User with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);

  const [user] = await query<User>(
    `INSERT INTO users (email, password_hash)
     VALUES ($1, $2)
     RETURNING id, email, subscription, subscription_expires_at, totp_enabled, is_blocked, created_at, updated_at`,
    [input.email.toLowerCase(), passwordHash]
  );

  return user as SafeUser;
}

export async function login(input: LoginInput): Promise<{ user: SafeUser; requires2FA: boolean }> {
  const user = await queryOne<User>(
    'SELECT * FROM users WHERE email = $1',
    [input.email.toLowerCase()]
  );

  if (!user) {
    throw new AuthError('Invalid email or password');
  }

  if (user.is_blocked) {
    throw new AuthError('Account is blocked');
  }

  const validPassword = await verifyPassword(user.password_hash, input.password);
  if (!validPassword) {
    throw new AuthError('Invalid email or password');
  }

  // Check if 2FA is required
  if (user.totp_enabled && !input.totpCode) {
    return { user: toSafeUser(user), requires2FA: true };
  }

  // 2FA verification will be handled in auth.controller.ts after this phase

  return { user: toSafeUser(user), requires2FA: false };
}

export async function getUserById(id: string): Promise<SafeUser | null> {
  const user = await queryOne<User>(
    'SELECT id, email, subscription, subscription_expires_at, totp_enabled, is_blocked, created_at, updated_at FROM users WHERE id = $1',
    [id]
  );
  return user as SafeUser | null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return queryOne<User>('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
}

function toSafeUser(user: User): SafeUser {
  const { password_hash, totp_secret, ...safe } = user;
  return safe;
}

export async function setup2FA(userId: string): Promise<{ secret: string; uri: string }> {
  const user = await queryOne<User>('SELECT email, totp_enabled FROM users WHERE id = $1', [userId]);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.totp_enabled) {
    throw new ConflictError('2FA is already enabled');
  }

  const secret = generateTotpSecret();
  const uri = generateTotpUri(user.email, secret);
  const encryptedSecret = encryptSecret(secret);

  // Store encrypted secret (not enabled yet until verified)
  await execute(
    'UPDATE users SET totp_secret = $1 WHERE id = $2',
    [encryptedSecret, userId]
  );

  return { secret, uri };
}

export async function verify2FASetup(userId: string, code: string): Promise<void> {
  const user = await queryOne<User>('SELECT totp_secret, totp_enabled FROM users WHERE id = $1', [userId]);

  if (!user || !user.totp_secret) {
    throw new ValidationError('2FA setup not initiated');
  }

  if (user.totp_enabled) {
    throw new ConflictError('2FA is already enabled');
  }

  const secret = decryptSecret(user.totp_secret);
  const isValid = verifyTotpCode(secret, code);

  if (!isValid) {
    throw new ValidationError('Invalid verification code');
  }

  await execute('UPDATE users SET totp_enabled = true WHERE id = $1', [userId]);
}

export async function verify2FALogin(userId: string, code: string): Promise<boolean> {
  const user = await queryOne<User>('SELECT totp_secret, totp_enabled FROM users WHERE id = $1', [userId]);

  if (!user || !user.totp_enabled || !user.totp_secret) {
    return false;
  }

  const secret = decryptSecret(user.totp_secret);
  return verifyTotpCode(secret, code);
}

export async function disable2FA(userId: string, code: string): Promise<void> {
  const user = await queryOne<User>('SELECT totp_secret, totp_enabled FROM users WHERE id = $1', [userId]);

  if (!user || !user.totp_enabled || !user.totp_secret) {
    throw new ValidationError('2FA is not enabled');
  }

  const secret = decryptSecret(user.totp_secret);
  const isValid = verifyTotpCode(secret, code);

  if (!isValid) {
    throw new ValidationError('Invalid verification code');
  }

  await execute('UPDATE users SET totp_enabled = false, totp_secret = NULL WHERE id = $1', [userId]);
}
