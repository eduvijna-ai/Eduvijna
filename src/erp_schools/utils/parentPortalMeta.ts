/**
 * Parent Portal constants — mirror web ParentPortalTab dropdowns / filters.
 * Quiz-React: components/ERPManagement/tabs/ParentPortalTab.tsx
 */

export const MEETING_TYPES = [
  'general',
  'academic',
  'disciplinary',
  'special',
  'orientation',
  'result_discussion',
  'other',
] as const;

export const PTM_STATUSES = [
  'scheduled',
  'ongoing',
  'completed',
  'cancelled',
  'postponed',
] as const;

export const APPT_STATUSES = [
  'booked',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
] as const;

export const COMM_TYPES = [
  'message',
  'feedback',
  'complaint',
  'suggestion',
  'appreciation',
  'query',
  'other',
] as const;

export const COMM_STATUSES = ['sent', 'read', 'replied', 'closed'] as const;

export function underscoreLabel(v: string): string {
  return v.replace(/_/g, ' ');
}

export function statusAccent(
  s: string,
): 'teal' | 'green' | 'orange' | 'red' | 'purple' | 'blue' {
  const v = s.toLowerCase();
  if (v === 'completed' || v === 'confirmed' || v === 'replied' || v === 'read')
    return 'green';
  if (v === 'cancelled' || v === 'no_show' || v === 'closed') return 'red';
  if (v === 'ongoing' || v === 'booked' || v === 'sent') return 'orange';
  if (v === 'postponed' || v === 'scheduled') return 'teal';
  return 'purple';
}
