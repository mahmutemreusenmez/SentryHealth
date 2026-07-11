export class AnonymizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnonymizationError';
  }
}
