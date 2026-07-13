import { describe, it, expect } from 'vitest';
import { PatientId } from '../../src/domain/value-objects/PatientId.js';

describe('PatientId', () => {
  it('creates a PatientId from a valid value', () => {
    const id = PatientId.create('p-001');
    expect(id.toString()).toBe('p-001');
  });

  it('trims surrounding whitespace', () => {
    const id = PatientId.create('  p-002  ');
    expect(id.toString()).toBe('p-002');
  });

  it('throws for an empty string', () => {
    expect(() => PatientId.create('')).toThrow('PatientId cannot be empty');
  });

  it('throws for a whitespace-only string', () => {
    expect(() => PatientId.create('   ')).toThrow('PatientId cannot be empty');
  });

  it('considers two ids with the same value equal', () => {
    const a = PatientId.create('same');
    const b = PatientId.create('same');
    expect(a.equals(b)).toBe(true);
  });

  it('treats trimmed values as equal to their untrimmed counterparts', () => {
    const a = PatientId.create('same');
    const b = PatientId.create('  same  ');
    expect(a.equals(b)).toBe(true);
  });

  it('considers ids with different values not equal', () => {
    const a = PatientId.create('a');
    const b = PatientId.create('b');
    expect(a.equals(b)).toBe(false);
  });
});
