import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: 'doctor' | 'admin';
  passwordHash: string;
}

export interface UserDto {
  id: string;
  username: string;
  displayName: string;
  role: 'doctor' | 'admin';
}

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  const derived = scryptSync(password, salt, expected.length);
  if (derived.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(derived, expected);
}

function toDto(user: User): UserDto {
  return { id: user.id, username: user.username, displayName: user.displayName, role: user.role };
}

export class InMemoryUserStore {
  private users = new Map<string, User>();

  constructor() {
    const adminUsername = env.ADMIN_USERNAME;
    this.users.set(adminUsername, {
      id: 'u-1',
      username: adminUsername,
      displayName: env.ADMIN_DISPLAY_NAME,
      role: 'admin',
      passwordHash: hashPassword(env.ADMIN_PASSWORD),
    });
  }

  findByUsername(username: string): User | undefined {
    return this.users.get(username);
  }

  findById(id: string): User | undefined {
    return Array.from(this.users.values()).find((user) => user.id === id);
  }

  findAll(): UserDto[] {
    return Array.from(this.users.values()).map(toDto);
  }

  createDoctor(input: { username: string; displayName: string; password: string }): UserDto {
    const username = input.username.trim().toLowerCase();
    if (!username || username.length < 3) {
      throw new Error('Kullanıcı adı en az 3 karakter olmalıdır');
    }
    if (this.users.has(username)) {
      throw new Error('Bu kullanıcı adı zaten kullanımda');
    }
    const password = input.password.trim();
    if (!password || password.length < 8) {
      throw new Error('Şifre en az 8 karakter olmalıdır');
    }
    const user: User = {
      id: randomUUID(),
      username,
      displayName: input.displayName.trim() || username,
      role: 'doctor',
      passwordHash: hashPassword(password),
    };
    this.users.set(username, user);
    return toDto(user);
  }

  delete(username: string): boolean {
    const user = this.users.get(username);
    if (!user) return false;
    if (user.role === 'admin') {
      throw new Error('Yönetici hesabı silinemez');
    }
    return this.users.delete(username);
  }
}

export const userStore = new InMemoryUserStore();

export const sessions = new Map<string, User>();
