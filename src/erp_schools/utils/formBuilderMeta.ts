/** Form Builder enums / labels — web FormBuilderTab parity. */

export const TEMPLATE_TYPES = [
  'survey',
  'feedback',
  'application',
  'registration',
  'assessment',
  'consent',
  'report',
  'other',
] as const;
export type TemplateType = (typeof TEMPLATE_TYPES)[number];

export const TEMPLATE_STATUSES = ['draft', 'published', 'closed', 'archived'] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

export const RESPONSE_STATUSES = [
  'submitted',
  'reviewed',
  'approved',
  'rejected',
] as const;
export type ResponseStatus = (typeof RESPONSE_STATUSES)[number];

export function templateStatusAccent(
  s?: string | null,
): 'green' | 'orange' | 'teal' | 'purple' | 'blue' | 'red' {
  const v = (s || '').toLowerCase();
  if (v === 'published') return 'green';
  if (v === 'draft') return 'orange';
  if (v === 'closed' || v === 'archived') return 'teal';
  return 'blue';
}

export function responseStatusAccent(
  s?: string | null,
): 'green' | 'orange' | 'purple' | 'red' | 'blue' | 'teal' {
  const v = (s || '').toLowerCase();
  if (v === 'approved') return 'green';
  if (v === 'reviewed') return 'orange';
  if (v === 'submitted') return 'purple';
  if (v === 'rejected') return 'red';
  return 'teal';
}
