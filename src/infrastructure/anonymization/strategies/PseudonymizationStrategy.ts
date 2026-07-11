export interface PseudonymizationStrategy {
  apply(value: string): string;
}
