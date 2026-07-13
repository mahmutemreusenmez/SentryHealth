import { describe, it, expect } from 'vitest';
import { ValidationError } from '../../src/application/errors/ValidationError.js';
import { AnonymizationError } from '../../src/application/errors/AnonymizationError.js';

describe('ValidationError', () => {
  it('is an Error with the correct name and message', () => {
    const err = new ValidationError('bad input');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.name).toBe('ValidationError');
    expect(err.message).toBe('bad input');
  });
});

describe('AnonymizationError', () => {
  it('is an Error with the correct name and message', () => {
    const err = new AnonymizationError('cannot anonymize');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AnonymizationError);
    expect(err.name).toBe('AnonymizationError');
    expect(err.message).toBe('cannot anonymize');
  });
});
