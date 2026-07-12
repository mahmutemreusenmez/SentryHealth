import { createHash, randomUUID } from 'node:crypto';

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

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

function toDto(user: User): UserDto {
  return { id: user.id, username: user.username, displayName: user.displayName, role: user.role };
}

export class InMemoryUserStore {
  private users = new Map<string, User>([
    [
      'yönetici',
      {
        id: 'u-1',
        username: 'yönetici',
        displayName: 'Prof. Dr. Ayşe Yılmaz',
        role: 'admin',
        passwordHash: hashPassword('yönetici123'),
      },
    ],
  ]);

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
    if (!password || password.length < 4) {
      throw new Error('Şifre en az 4 karakter olmalıdır');
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
