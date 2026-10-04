/**
 * Report integrity (DESIGN_SPEC PART 30, 31).
 *
 * Produces a canonical representation of report data and a SHA-256 digest so
 * any later copy can be checked byte-for-byte. IMPORTANT (honesty): this proves
 * the data was not altered; it does NOT by itself confer legal validity — that
 * depends on the deploying authority's signature framework and regulations.
 */

/** Deterministic JSON with sorted keys (canonical form for hashing). */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: any): any {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc: Record<string, any>, k) => {
        acc[k] = sortKeys(value[k]);
        return acc;
      }, {});
  }
  return value;
}

export async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  if (globalThis.crypto?.subtle) {
    const buf = await globalThis.crypto.subtle.digest('SHA-256', enc);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return fnv1aHex(input); // non-crypto fallback (should not occur in browser)
}

function fnv1aHex(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Short, human-friendly fingerprint for display (first 16 hex chars, grouped). */
export function shortFingerprint(hash: string): string {
  return (hash.slice(0, 16).match(/.{1,4}/g) || []).join(' ').toUpperCase();
}
