/** Library enums / labels — web LibraryTab parity. */

export const BOOK_CATEGORIES = [
  'general',
  'textbook',
  'reference',
  'fiction',
  'non_fiction',
  'periodical',
  'journal',
  'other',
] as const;

export type BookCategory = (typeof BOOK_CATEGORIES)[number];

export const TX_STATUSES = ['issued', 'returned', 'overdue', 'lost'] as const;
export type TxStatus = (typeof TX_STATUSES)[number];

export const MEMBER_TYPES = ['student', 'staff'] as const;
export type MemberType = (typeof MEMBER_TYPES)[number];

export const TX_STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  issued: { bg: '#cce9f0', fg: '#0e7490' },
  returned: { bg: '#dcfce7', fg: '#16a34a' },
  overdue: { bg: '#fee2e2', fg: '#dc2626' },
  lost: { bg: '#f1f5f9', fg: '#64748b' },
};

export function categoryLabel(cat?: string | null): string {
  return (cat || 'general').replace(/_/g, ' ');
}
