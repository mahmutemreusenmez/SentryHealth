import type { Request } from 'express';

/**
 * Returns the request body as a plain object when Express has already parsed it
 * (e.g. via `express.json()`), otherwise an empty object.
 */
export function getJsonBody(req: Request): Record<string, unknown> {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body as Record<string, unknown>;
  }
  return {};
}

/**
 * Like {@link getJsonBody} but also tolerant of string/Buffer bodies and of
 * requests whose body has not yet been consumed, reading the raw stream as a
 * fallback. Always resolves to an object (empty on any parse failure).
 */
export async function parseJsonBody(req: Request): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  if (Buffer.isBuffer(req.body)) {
    try { return JSON.parse(req.body.toString()); } catch { return {}; }
  }
  return new Promise((resolve) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

/**
 * Extracts a bearer token from the Authorization header, or null when absent
 * or malformed.
 */
export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}
