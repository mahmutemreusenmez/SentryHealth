export class KAnonymityStrategy {
  constructor(private readonly k: number) {
    if (k < 1) throw new Error('k must be a positive integer');
  }

  generalize(records: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
    return records.map(record => {
      const clone = { ...record };
      if (clone.age && typeof clone.age === 'number') {
        const lower = Math.floor((clone.age as number) / this.k) * this.k;
        clone.age = `${lower}-${lower + this.k - 1}`;
      }
      return clone;
    });
  }
}
