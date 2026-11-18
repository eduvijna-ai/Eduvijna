/**
 * Prefix relative school logo API paths so Image / img resolve against the API origin.
 * Mirrors Quiz-React useEffectiveSchoolBranding.resolveLogoUrl.
 */

export function resolveLogoUrl(
  raw: string | null | undefined,
  apiOrigin: string,
): string | undefined {
  if (!raw) return undefined;
  const url = raw.trim();
  if (!url) return undefined;
  if (url.startsWith('/api/')) {
    const base = apiOrigin.replace(/\/$/, '');
    return `${base}${url}`;
  }
  return url;
}

/**
 * Append/replace a cache-busting query so same-path logo replacements revalidate.
 */
export function withLogoCacheBust(absoluteUrl: string, revision: number | string): string {
  const bust = String(revision);
  try {
    const parsed = new URL(absoluteUrl);
    parsed.searchParams.set('v', bust);
    return parsed.toString();
  } catch {
    const joiner = absoluteUrl.includes('?') ? '&' : '?';
    return `${absoluteUrl}${joiner}v=${encodeURIComponent(bust)}`;
  }
}
