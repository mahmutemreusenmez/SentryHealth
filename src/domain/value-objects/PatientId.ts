export class PatientId {
  private constructor(private readonly value: string) {}

  static create(value: string): PatientId {
    if (!value || value.trim().length === 0) {
      throw new Error('PatientId cannot be empty');
    }
    return new PatientId(value.trim());
  }

  toString(): string {
    return this.value;
  }

  equals(other: PatientId): boolean {
    return this.value === other.value;
  }
}
