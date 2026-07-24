/**
 * Resolve a friendly display name (web AuthContext / ERPDashboardTab parity).
 * Prefer full_name from /auth/profile; never prefer raw username when a real name exists.
 */

export type DisplayNameSource = {
  full_name?: string | null;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
};

function clean(v?: string | null): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Title-case a username segment: samatha → Samatha */
function titleCase(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** demo_samatha / demo.samatha → Samatha (last non-prefix segment) */
function humanizeUsername(username: string): string {
  const parts = username.split(/[._\s-]+/).filter(Boolean);
  const skip = /^(demo|test|user|admin|tmp|temp)$/i;
  const meaningful = parts.filter((p) => !skip.test(p));
  const pick = (meaningful.length ? meaningful : parts).pop() || username;
  return titleCase(pick);
}

export function resolveDisplayName(
  user: DisplayNameSource | null | undefined,
  fallback = 'Teacher',
): string {
  if (!user) return fallback;

  const fullName = clean(user.full_name);
  if (fullName) return fullName;

  const fromParts = [clean(user.first_name), clean(user.last_name)].filter(Boolean).join(' ');
  if (fromParts) return fromParts;

  const username = clean(user.username);
  const alt = clean(user.name);
  if (alt && (!username || alt.toLowerCase() !== username.toLowerCase())) {
    return alt;
  }

  if (username) return humanizeUsername(username);
  return fallback;
}

export function resolveFirstName(
  user: DisplayNameSource | null | undefined,
  fallback = 'Teacher',
): string {
  const display = resolveDisplayName(user, fallback);
  return display.split(/\s+/)[0] || display;
}
