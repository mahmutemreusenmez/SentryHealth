import { describe, it, expect } from 'vitest';
import { InMemoryPatientRepository } from '../../src/infrastructure/persistence/InMemoryPatientRepository.js';
import type { AnonymizedPatient } from '../../src/application/ports/Anonymizer.js';

const patient = (pseudonym: string): AnonymizedPatient => ({ id: `id-${pseudonym}`, pseudonym, healthData: [] });

describe('InMemoryPatientRepository', () => {
  it('saves and retrieves a patient by pseudonym', async () => {
    const repo = new InMemoryPatientRepository();
    await repo.save(patient('p1'));
    const found = await repo.findByPseudonym('p1');
    expect(found?.pseudonym).toBe('p1');
  });

  it('returns undefined for an unknown pseudonym', async () => {
    const repo = new InMemoryPatientRepository();
    expect(await repo.findByPseudonym('missing')).toBeUndefined();
  });

  it('overwrites an existing record with the same pseudonym', async () => {
    const repo = new InMemoryPatientRepository();
    await repo.save(patient('p1'));
    await repo.save({ ...patient('p1'), id: 'updated' });
    const found = await repo.findByPseudonym('p1');
    expect(found?.id).toBe('updated');
    expect(await repo.findAll()).toHaveLength(1);
  });

  it('lists all saved patients', async () => {
    const repo = new InMemoryPatientRepository();
    await repo.save(patient('p1'));
    await repo.save(patient('p2'));
    const all = await repo.findAll();
    expect(all.map((p) => p.pseudonym).sort()).toEqual(['p1', 'p2']);
  });

  it('starts empty', async () => {
    const repo = new InMemoryPatientRepository();
    expect(await repo.findAll()).toEqual([]);
  });
});
