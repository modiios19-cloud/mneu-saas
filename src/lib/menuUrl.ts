/** A menu's identifier stays stable; the published base URL must also remain stable. */
export function menuUrl(slug: string, publicBaseUrl?: string): string {
  const fallback = typeof window === 'undefined' ? 'https://example.invalid/' : `${window.location.origin}${window.location.pathname}`;
  const url = new URL(publicBaseUrl || fallback);
  url.search = '';
  url.hash = '';
  url.searchParams.set('id', slug);
  return url.toString();
}

/** Temporary preview URLs should never be printed as the permanent QR. */
export function isTemporaryMenuUrl(value: string): boolean {
  try { const host = new URL(value).hostname.toLowerCase(); return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.e2b.app'); }
  catch { return false; }
}
