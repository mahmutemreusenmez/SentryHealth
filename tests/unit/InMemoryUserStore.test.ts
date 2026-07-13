import { describe, it, expect } from 'vitest';
import { InMemoryUserStore, hashPassword } from '../../src/infrastructure/persistence/InMemoryUserStore.js';

describe('hashPassword', () => {
  it('hashes deterministically and does not return the plaintext', () => {
    expect(hashPassword('secret')).toBe(hashPassword('secret'));
    expect(hashPassword('secret')).not.toBe('secret');
    expect(hashPassword('a')).not.toBe(hashPassword('b'));
  });
});

describe('InMemoryUserStore', () => {
  it('seeds a default admin user', () => {
    const store = new InMemoryUserStore();
    const admin = store.findByUsername('yönetici');
    expect(admin?.role).toBe('admin');
    expect(admin?.passwordHash).toBe(hashPassword('yönetici123'));
  });

  it('finds a user by id', () => {
    const store = new InMemoryUserStore();
    expect(store.findById('u-1')?.username).toBe('yönetici');
    expect(store.findById('nope')).toBeUndefined();
  });

  it('lists users as DTOs without password hashes', () => {
    const store = new InMemoryUserStore();
    const users = store.findAll();
    expect(users).toHaveLength(1);
    expect(users[0]).not.toHaveProperty('passwordHash');
  });

  it('creates a doctor, normalizing the username', () => {
    const store = new InMemoryUserStore();
    const doctor = store.createDoctor({ username: '  DrHouse  ', displayName: 'Dr. House', password: 'pw12' });
    expect(doctor.username).toBe('drhouse');
    expect(doctor.role).toBe('doctor');
    expect(store.findByUsername('drhouse')).toBeDefined();
  });

  it('defaults the display name to the username when blank', () => {
    const store = new InMemoryUserStore();
    const doctor = store.createDoctor({ username: 'drjekyll', displayName: '   ', password: 'pw12' });
    expect(doctor.displayName).toBe('drjekyll');
  });

  it('rejects short usernames and passwords', () => {
    const store = new InMemoryUserStore();
    expect(() => store.createDoctor({ username: 'ab', displayName: 'x', password: 'pw12' })).toThrow('Kullanıcı adı');
    expect(() => store.createDoctor({ username: 'validname', displayName: 'x', password: '1' })).toThrow('Şifre');
  });

  it('rejects a duplicate username', () => {
    const store = new InMemoryUserStore();
    store.createDoctor({ username: 'drwho', displayName: 'Dr Who', password: 'pw12' });
    expect(() => store.createDoctor({ username: 'drwho', displayName: 'Dr Who', password: 'pw12' })).toThrow(
      'zaten kullanımda'
    );
  });

  it('deletes a doctor but not the admin', () => {
    const store = new InMemoryUserStore();
    store.createDoctor({ username: 'drtemp', displayName: 'Temp', password: 'pw12' });
    expect(store.delete('drtemp')).toBe(true);
    expect(store.delete('drtemp')).toBe(false);
    expect(() => store.delete('yönetici')).toThrow('Yönetici hesabı silinemez');
  });
});
