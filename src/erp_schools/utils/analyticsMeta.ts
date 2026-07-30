/**
 * Analytics constants — mirror web AnalyticsTab + SchoolDocumentsPanel.
 */

export const REPORT_TYPES = [
  'attendance',
  'academic',
  'financial',
  'library',
  'transport',
  'hostel',
  'inventory',
  'hr',
  'enrollment',
  'custom',
  'other',
] as const;

export const CHART_TYPES = [
  'bar',
  'line',
  'pie',
  'doughnut',
  'area',
  'table',
  'heatmap',
] as const;

export const SNAPSHOT_FORMATS = ['json', 'pdf', 'csv', 'xlsx'] as const;

export const WIDGET_TYPES = [
  'kpi',
  'chart',
  'table',
  'counter',
  'trend',
  'comparison',
  'list',
] as const;

export const WIDGET_SIZES = ['small', 'medium', 'large', 'full'] as const;

export type DocumentCategory = 'academic' | 'certificates' | 'receipts';
export type DocumentAccent =
  | 'blue'
  | 'teal'
  | 'green'
  | 'purple'
  | 'orange'
  | 'rose'
  | 'slate';

export type ReceiptKind =
  | 'fee'
  | 'transport'
  | 'hostel'
  | 'library_fine'
  | 'uniform'
  | 'books'
  | 'examination'
  | 'miscellaneous'
  | 'refund'
  | 'payment_ack';

export type CertificateKind =
  | 'transfer_certificate'
  | 'bonafide'
  | 'study'
  | 'character'
  | 'conduct'
  | 'achievement'
  | 'participation'
  | 'merit'
  | 'sports'
  | 'completion'
  | 'appreciation';

export type AcademicDocId =
  | 'academic_report'
  | 'progress_report'
  | 'co_scholastic'
  | 'transfer_certificate';

export const RECEIPT_CATALOG: Array<{
  kind: ReceiptKind;
  title: string;
  section: string;
  accent: DocumentAccent;
}> = [
  { kind: 'fee', title: 'Fee Receipt', section: 'Fees', accent: 'blue' },
  { kind: 'transport', title: 'Transport Fee Receipt', section: 'Transport', accent: 'green' },
  { kind: 'hostel', title: 'Hostel Fee Receipt', section: 'Hostel', accent: 'teal' },
  { kind: 'library_fine', title: 'Library Fine Receipt', section: 'Library', accent: 'purple' },
  { kind: 'uniform', title: 'Uniform Receipt', section: 'Inventory', accent: 'orange' },
  { kind: 'books', title: 'Books Receipt', section: 'Library', accent: 'rose' },
  { kind: 'examination', title: 'Examination Fee Receipt', section: 'Exams', accent: 'blue' },
  { kind: 'miscellaneous', title: 'Miscellaneous Receipt', section: 'Finance', accent: 'slate' },
  { kind: 'refund', title: 'Refund Receipt', section: 'Finance', accent: 'purple' },
  { kind: 'payment_ack', title: 'Payment Acknowledgement', section: 'Finance', accent: 'teal' },
];

export const ACADEMIC_CATALOG: Array<{
  id: AcademicDocId;
  title: string;
  description: string;
  accent: DocumentAccent;
}> = [
  {
    id: 'academic_report',
    title: 'Academic Report Card',
    description: 'Subject-wise performance with grades and summary.',
    accent: 'blue',
  },
  {
    id: 'progress_report',
    title: 'Progress Report',
    description: 'Term-wise marks and teacher remarks.',
    accent: 'purple',
  },
  {
    id: 'co_scholastic',
    title: 'Co-Scholastic Report',
    description: 'Skills, personality traits, and holistic assessment.',
    accent: 'green',
  },
  {
    id: 'transfer_certificate',
    title: 'Transfer Certificate',
    description: 'Official TC with conduct and promotion details.',
    accent: 'teal',
  },
];

export const CERTIFICATE_CATALOG: Array<{
  kind: CertificateKind;
  title: string;
  subtitle?: string;
  highlight?: string;
  code: string;
  accent: DocumentAccent;
}> = [
  { kind: 'bonafide', title: 'Bonafide Certificate', subtitle: 'To whom it may concern', code: 'BON', accent: 'blue' },
  { kind: 'study', title: 'Study Certificate', code: 'STU', accent: 'teal' },
  { kind: 'character', title: 'Character Certificate', code: 'CHR', accent: 'green' },
  { kind: 'conduct', title: 'Conduct Certificate', code: 'CND', accent: 'green' },
  { kind: 'achievement', title: 'Achievement Certificate', highlight: 'For outstanding achievement', code: 'ACH', accent: 'orange' },
  { kind: 'participation', title: 'Participation Certificate', code: 'PAR', accent: 'purple' },
  { kind: 'merit', title: 'Merit Certificate', highlight: 'For academic merit', code: 'MER', accent: 'blue' },
  { kind: 'sports', title: 'Sports Certificate', code: 'SPT', accent: 'green' },
  { kind: 'completion', title: 'Completion Certificate', code: 'CMP', accent: 'teal' },
  { kind: 'appreciation', title: 'Appreciation Certificate', code: 'APP', accent: 'rose' },
  { kind: 'transfer_certificate', title: 'Transfer Certificate (Formal)', subtitle: 'School leaving certificate', code: 'TC', accent: 'slate' },
];

export function accentColor(accent: DocumentAccent): string {
  const map: Record<DocumentAccent, string> = {
    blue: '#0ea5e9',
    teal: '#0f766e',
    green: '#16a34a',
    purple: '#7c3aed',
    orange: '#ea580c',
    rose: '#e11d48',
    slate: '#64748b',
  };
  return map[accent] || '#0f766e';
}

export function formatPrintDate(value?: string | Date | null): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function classSectionLabel(
  className?: string | null,
  sectionName?: string | null,
): string {
  const c = (className || '').trim();
  const s = (sectionName || '').trim();
  if (c && s) return `${c} ${s}`;
  return c || s || '—';
}
