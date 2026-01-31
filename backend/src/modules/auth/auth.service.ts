import { query, queryOne } from '../../db/queries/index.js';
import { hashPassword, verifyPassword } from '../../utils/crypto.js';
import { ConflictError, AuthError } from '../../utils/errors.js';
import { RegisterInput, LoginInput } from './auth.schema.js';

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
