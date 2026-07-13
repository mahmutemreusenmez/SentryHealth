import { describe, it, expect } from 'vitest';
import { TokenVault } from '../../src/infrastructure/anonymization/strategies/TokenVault.js';

describe('TokenVault', () => {
  it('tokenizes deterministically for the same value', () => {
    const vault = new TokenVault('secret-key');
    const a = vault.tokenize('patient-1');
    const b = vault.tokenize('patient-1');
    expect(a).toBe(b);
    expect(a).not.toBe('patient-1');
    expect(a).toHaveLength(16);
  });

  it('produces different tokens for different values', () => {
    const vault = new TokenVault('secret-key');
    expect(vault.tokenize('a')).not.toBe(vault.tokenize('b'));
  });

  it('produces different tokens under different keys', () => {
    expect(new TokenVault('key-1').tokenize('x')).not.toBe(new TokenVault('key-2').tokenize('x'));
  });

  it('clears the cache without affecting determinism', () => {
    const vault = new TokenVault('secret-key');
    const before = vault.tokenize('x');
    vault.clear();
    expect(vault.tokenize('x')).toBe(before);
  });
});
