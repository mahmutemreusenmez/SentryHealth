import { createHmac } from 'node:crypto';

export class TokenVault {
  private cache = new Map<string, string>();

  constructor(private readonly key: string) {}

  tokenize(value: string): string {
    if (this.cache.has(value)) return this.cache.get(value)!;

    const token = createHmac('sha256', this.key).update(value).digest('hex').slice(0, 16);
    this.cache.set(value, token);
    return token;
  }

  clear(): void {
    this.cache.clear();
  }
}
