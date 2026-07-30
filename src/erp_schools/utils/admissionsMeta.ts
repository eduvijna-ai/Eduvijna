/** Admissions Operations Desk enums — web AdmissionsTab + Admission Pipeline CRM. */

/**
 * 11 CRM pipeline stages (Admission Enquiry left rail).
 * `match` covers both legacy API statuses (enquiry…withdrawn) and newer CRM keys
 * (new, contacted, documents…) so status-counts and list filters stay accurate.
 * `writeStatus` is what we POST/PATCH when creating or moving into the stage.
 */
export const ADMISSION_PIPELINE_STAGES = [
  { key: 'new', label: 'New', match: ['enquiry', 'new'], writeStatus: 'enquiry' },
  { key: 'contacted', label: 'Contacted', match: ['applied', 'contacted'], writeStatus: 'applied' },
  {
    key: 'documents',
    label: 'Documents',
    match: ['documents'],
    writeStatus: 'documents',
  },
  {
    key: 'docs_verified',
    label: 'Docs Verified',
    match: ['docs_verified'],
    writeStatus: 'docs_verified',
  },
  {
    key: 'assessment',
    label: 'Assessment',
    match: ['entrance_test', 'assessment'],
    writeStatus: 'entrance_test',
  },
  {
    key: 'principal',
    label: 'Principal',
    match: ['interview', 'principal'],
    writeStatus: 'interview',
  },
  {
    key: 'seat_offered',
    label: 'Seat Offered',
    match: ['offered', 'seat_offered'],
    writeStatus: 'offered',
  },
  {
    key: 'payment',
    label: 'Payment',
    match: ['accepted', 'payment'],
    writeStatus: 'accepted',
  },
  { key: 'enrolled', label: 'Enrolled', match: ['enrolled'], writeStatus: 'enrolled' },
  { key: 'rejected', label: 'Rejected', match: ['rejected'], writeStatus: 'rejected' },
  {
    key: 'withdrawn',
    label: 'Withdrawn',
    match: ['withdrawn', 'lead_closed'],
    writeStatus: 'withdrawn',
  },
] as const;

export type PipelineStageKey = (typeof ADMISSION_PIPELINE_STAGES)[number]['key'];

/** Quick-move targets shown in Admission Workspace (web parity). */
export const WORKSPACE_QUICK_MOVES = [
  { key: 'contacted', label: 'Contacted' },
  { key: 'documents', label: 'Documents Pending' },
  { key: 'seat_offered', label: 'Seat Offered' },
  { key: 'rejected', label: 'Rejected' },
] as const;

export type WorkspaceTab = 'overview' | 'student' | 'parent' | 'timeline' | 'quick_edit';

export const WORKSPACE_TABS: Array<{ key: WorkspaceTab; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'student', label: 'Student' },
  { key: 'parent', label: 'Parent' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'quick_edit', label: 'Quick Edit' },
];

/** Flat status list for forms / move-to (legacy 9 + CRM extras). */
export const ADMISSION_STATUSES = [
  'enquiry',
  'applied',
  'entrance_test',
  'interview',
  'offered',
  'accepted',
  'enrolled',
  'rejected',
  'withdrawn',
  'new',
  'contacted',
  'documents',
  'docs_verified',
  'assessment',
  'principal',
  'seat_offered',
  'payment',
  'lead_closed',
] as const;
export type AdmissionStatus = (typeof ADMISSION_STATUSES)[number];

export function pipelineStageForStatus(status?: string | null) {
  const v = (status || '').toLowerCase();
  return (
    ADMISSION_PIPELINE_STAGES.find((s) =>
      (s.match as readonly string[]).includes(v),
    ) ?? ADMISSION_PIPELINE_STAGES[0]
  );
}

export function pipelineStageLabel(status?: string | null): string {
  return pipelineStageForStatus(status).label;
}

export function pipelineStageCount(
  counts: Record<string, number>,
  stage: (typeof ADMISSION_PIPELINE_STAGES)[number],
): number {
  return (stage.match as readonly string[]).reduce(
    (sum, key) => sum + (counts[key] ?? 0),
    0,
  );
}

/** Prefer a status key that already has counts; else writeStatus / first match. */
export function resolvePipelineListStatus(
  stageKey: string,
  counts: Record<string, number>,
): string {
  const stage = ADMISSION_PIPELINE_STAGES.find((s) => s.key === stageKey);
  if (!stage) return stageKey;
  const withCount = (stage.match as readonly string[]).find((k) => (counts[k] ?? 0) > 0);
  return withCount || stage.writeStatus || stage.match[0];
}

export const SOURCE_OPTIONS = [
  'Front Office',
  'Website',
  'Walk-in',
  'Phone',
  'WhatsApp',
  'Email',
  'Referral',
  'Other',
] as const;

export const REFERENCE_OPTIONS = [
  'Self',
  'Friend',
  'Newspaper',
  'Online',
  'Social Media',
  'Agent',
  'Other',
] as const;

export const GENDER_OPTIONS = ['male', 'female', 'other'] as const;

export const CALL_TYPES = ['incoming', 'outgoing'] as const;

export const VISITOR_PURPOSE_OPTIONS = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'parent_visit', label: 'Parent Visit' },
  { value: 'official', label: 'Official Visit' },
  { value: 'interview', label: 'Interview' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'general', label: 'General' },
  { value: 'other', label: 'Other' },
] as const;

export const VISITOR_FILTER_STATUSES = [
  'all',
  'pre_registered',
  'checked_in',
  'checked_out',
  'denied',
  'cancelled',
  'deactivated',
] as const;

export const VISITOR_FORM_STATUSES = [
  'pre_registered',
  'checked_in',
  'checked_out',
  'denied',
  'cancelled',
] as const;

export const VISITOR_ID_TYPES = [
  'aadhar',
  'pan',
  'passport',
  'driving_license',
  'voter_id',
  'other',
] as const;

export const MEETING_WITH_PRESETS = [
  'Admission Counsellor',
  'Front Office',
  'Principal',
  'Accounts Office',
  'Reception Desk',
] as const;

export const INCIDENT_TYPES = [
  'accident',
  'injury',
  'fight',
  'theft',
  'vandalism',
  'fire',
  'medical',
  'bullying',
  'trespassing',
  'general',
  'other',
] as const;

export const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

export const INCIDENT_STATUSES = [
  'reported',
  'investigating',
  'action_taken',
  'resolved',
  'closed',
  'escalated',
] as const;

export const CONTACT_TYPES = [
  'internal',
  'police',
  'fire',
  'ambulance',
  'hospital',
  'parent_helpline',
  'other',
] as const;

export function enumLabel(value?: string | null): string {
  return (value || '').replace(/_/g, ' ') || '—';
}

export function admissionStatusAccent(
  s?: string | null,
): 'green' | 'orange' | 'blue' | 'purple' | 'teal' | 'red' {
  const stage = pipelineStageForStatus(s);
  if (stage.key === 'enrolled' || stage.key === 'payment') return 'green';
  if (stage.key === 'new' || stage.key === 'contacted') return 'blue';
  if (
    stage.key === 'documents' ||
    stage.key === 'docs_verified' ||
    stage.key === 'assessment' ||
    stage.key === 'principal' ||
    stage.key === 'seat_offered'
  ) {
    return 'orange';
  }
  if (stage.key === 'rejected' || stage.key === 'withdrawn') return 'red';
  return 'purple';
}

export function severityAccent(
  s?: string | null,
): 'green' | 'orange' | 'red' | 'purple' | 'teal' {
  const v = (s || '').toLowerCase();
  if (v === 'low') return 'green';
  if (v === 'medium') return 'orange';
  if (v === 'high' || v === 'critical') return 'red';
  return 'teal';
}
