/**
 * Resolve a human-readable person name from common ERP / SIS response shapes.
 * Prefer joined name fields; never invent scores or fabricate unknown identities.
 */

function clean(value: unknown): string {
  if (value == null) return '';
  const s = String(value).trim();
  return s;
}

export function resolvePersonDisplayName(
  row: Record<string, unknown> | null | undefined,
  fallbackLabel: string,
  fallbackId?: string | number | null,
): string {
  if (!row) {
    return fallbackId != null && String(fallbackId).trim() !== ''
      ? `${fallbackLabel} #${fallbackId}`
      : fallbackLabel;
  }

  const first = clean(row.first_name);
  const last = clean(row.last_name);
  const fromParts = [first, last].filter(Boolean).join(' ');
  const candidates = [
    clean(row.student_name),
    clean(row.full_name),
    clean(row.staff_name),
    clean(row.name),
    fromParts,
    clean(row.display_name),
    clean(row.username),
  ].filter(Boolean);

  if (candidates.length > 0) {
    return candidates[0];
  }

  const id =
    fallbackId ??
    row.profile_id ??
    row.user_id ??
    row.student_id ??
    row.staff_id ??
    row.id;
  if (id != null && String(id).trim() !== '') {
    return `${fallbackLabel} #${id}`;
  }
  return fallbackLabel;
}
