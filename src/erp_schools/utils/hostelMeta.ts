/** Hostel enums / labels — web HostelTab parity. */

export const ROOM_TYPES = ['single', 'double', 'triple', 'shared', 'dormitory'] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const ROOM_STATUSES = ['available', 'full', 'maintenance', 'closed'] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

export const COMPLAINT_TYPES = [
  'maintenance',
  'cleanliness',
  'food',
  'security',
  'noise',
  'ragging',
  'general',
  'other',
] as const;
export type ComplaintType = (typeof COMPLAINT_TYPES)[number];

export const COMPLAINT_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type ComplaintPriority = (typeof COMPLAINT_PRIORITIES)[number];

export const COMPLAINT_STATUSES = [
  'open',
  'in_progress',
  'resolved',
  'closed',
  'rejected',
] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const ROOM_STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  available: { bg: '#dcfce7', fg: '#16a34a' },
  full: { bg: '#ede9fe', fg: '#4f46e5' },
  maintenance: { bg: '#fef3c7', fg: '#d97706' },
  closed: { bg: '#f1f5f9', fg: '#64748b' },
  active: { bg: '#dcfce7', fg: '#16a34a' },
  inactive: { bg: '#f1f5f9', fg: '#64748b' },
};

export const PRIORITY_COLORS: Record<string, { bg: string; fg: string }> = {
  low: { bg: '#f1f5f9', fg: '#64748b' },
  medium: { bg: '#ede9fe', fg: '#4f46e5' },
  high: { bg: '#fef3c7', fg: '#d97706' },
  critical: { bg: '#fee2e2', fg: '#dc2626' },
};

export const COMPLAINT_STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  open: { bg: '#fee2e2', fg: '#dc2626' },
  in_progress: { bg: '#fef3c7', fg: '#d97706' },
  resolved: { bg: '#dcfce7', fg: '#16a34a' },
  closed: { bg: '#f1f5f9', fg: '#64748b' },
  rejected: { bg: '#f1f5f9', fg: '#64748b' },
};

export function enumLabel(value?: string | null): string {
  return (value || '').replace(/_/g, ' ') || '—';
}

export function roomDisplayName(r: {
  id: number;
  block?: string;
  roomNumber?: string;
  floor?: number | null;
}): string {
  const parts = [
    r.block || null,
    r.roomNumber ? `Room ${r.roomNumber}` : null,
    r.floor != null ? `Fl ${r.floor}` : null,
  ].filter(Boolean);
  return parts.join(' · ') || `Room #${r.id}`;
}

export function studentDisplayName(s: {
  userId?: number;
  profileId?: number;
  name?: string;
  username?: string;
  admissionNumber?: string;
  className?: string;
  sectionName?: string;
}): string {
  const base =
    s.name || s.username || `Student #${s.userId ?? s.profileId ?? ''}`;
  const extra = [
    s.admissionNumber ? `(${s.admissionNumber})` : null,
    s.className
      ? `${s.className}${s.sectionName ? ` ${s.sectionName}` : ''}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return extra ? `${base} — ${extra}` : base;
}

export function formatRent(amount: number): string {
  if (!amount || amount <= 0) return '—';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}
