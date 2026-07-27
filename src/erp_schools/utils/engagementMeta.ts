/** Engagement enums — web StudentEngagementTab parity. */

export const ENGAGEMENT_TABS = [
  { key: 'councils', label: 'Councils', icon: 'people-outline' as const },
  { key: 'members', label: 'Members', icon: 'person-add-outline' as const },
  { key: 'grievances', label: 'Grievances', icon: 'document-text-outline' as const },
  { key: 'events', label: 'Events', icon: 'calendar-outline' as const },
  { key: 'registrations', label: 'Registrations', icon: 'clipboard-outline' as const },
  { key: 'gallery', label: 'Gallery', icon: 'images-outline' as const },
] as const;

export type EngagementTabKey = (typeof ENGAGEMENT_TABS)[number]['key'];

export const COUNCIL_TYPES = [
  'general',
  'academic',
  'cultural',
  'sports',
  'disciplinary',
  'literary',
  'social_service',
  'other',
] as const;

export const MEMBER_ROLES = [
  'president',
  'vice_president',
  'secretary',
  'treasurer',
  'member',
  'representative',
] as const;

export const GRIEVANCE_TYPES = [
  'academic',
  'faculty',
  'infrastructure',
  'hostel',
  'transport',
  'canteen',
  'bullying',
  'discrimination',
  'general',
  'other',
] as const;

export const GRIEVANCE_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

export const GRIEVANCE_STATUSES = [
  'submitted',
  'under_review',
  'in_progress',
  'resolved',
  'closed',
  'rejected',
] as const;

export const EVENT_TYPES = [
  'academic',
  'cultural',
  'sports',
  'workshop',
  'seminar',
  'competition',
  'fest',
  'holiday',
  'exam',
  'general',
  'other',
] as const;

export const EVENT_STATUSES = [
  'draft',
  'upcoming',
  'ongoing',
  'completed',
  'cancelled',
  'postponed',
] as const;

export const GALLERY_CATEGORIES = [
  'event',
  'academic',
  'sports',
  'cultural',
  'campus',
  'achievement',
  'general',
  'other',
] as const;

export const MEDIA_TYPES = ['image', 'video', 'document'] as const;

export function enumLabel(value?: string | null): string {
  return (value || '').replace(/_/g, ' ');
}

export function statusTone(status?: string): 'green' | 'blue' | 'orange' | 'red' | 'purple' | 'teal' | 'pink' {
  const s = (status || '').toLowerCase();
  if (['active', 'resolved', 'completed', 'upcoming'].includes(s)) return 'green';
  if (['submitted', 'draft', 'under_review'].includes(s)) return 'blue';
  if (['in_progress', 'ongoing', 'postponed'].includes(s)) return 'orange';
  if (['rejected', 'cancelled', 'closed', 'dissolved'].includes(s)) return 'red';
  if (['featured'].includes(s)) return 'pink';
  if (['critical', 'high'].includes(s)) return 'purple';
  return 'teal';
}
