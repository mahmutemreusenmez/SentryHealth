import { describe, it, expect } from 'vitest';
import { KAnonymityStrategy } from '../../src/infrastructure/anonymization/strategies/KAnonymityStrategy.js';

describe('KAnonymityStrategy', () => {
  it('throws when k is less than 1', () => {
    expect(() => new KAnonymityStrategy(0)).toThrow('k must be a positive integer');
  });

  it('generalizes numeric ages into ranges', () => {
    const strategy = new KAnonymityStrategy(10);
    const result = strategy.generalize([{ age: 34 }, { age: 41 }]);
    expect(result[0].age).toBe('30-39');
    expect(result[1].age).toBe('40-49');
  });

  it('leaves records without a numeric age untouched', () => {
    const strategy = new KAnonymityStrategy(5);
    const result = strategy.generalize([{ name: 'x' }, { age: 'unknown' }]);
    expect(result[0]).toEqual({ name: 'x' });
    expect(result[1].age).toBe('unknown');
  });

  it('does not mutate the input records', () => {
    const strategy = new KAnonymityStrategy(10);
    const input = [{ age: 25 }];
    strategy.generalize(input);
    expect(input[0].age).toBe(25);
  });
});
