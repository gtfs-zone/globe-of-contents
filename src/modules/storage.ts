/**
 * Per-device preferences in localStorage. Every read and write tolerates a
 * browser that refuses storage (private windows, quota), falling back to the
 * defaults rather than failing the page.
 */

export function readStored<T>(key: string): Partial<T> | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Partial<T>) : null;
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage refused; the preference simply does not persist.
  }
}
