/**
 * Serializes a timestamp that may be a Date or an already-serialized value into
 * an ISO string, without throwing on non-Date inputs.
 */
export function toISOString(timestamp: unknown): string {
  return timestamp instanceof Date ? timestamp.toISOString() : String(timestamp);
}
