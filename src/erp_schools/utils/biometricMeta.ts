/** Biometric enums / labels — web BiometricTab parity. */

export const DEVICE_TYPES = [
  'fingerprint',
  'face',
  'rfid',
  'iris',
  'palm',
  'multi',
] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export const DEVICE_STATUSES = [
  'active',
  'inactive',
  'maintenance',
  'faulty',
] as const;
export type DeviceStatus = (typeof DEVICE_STATUSES)[number];

export const ENROLL_STATUSES = [
  'pending',
  'enrolled',
  'failed',
  'revoked',
] as const;
export type EnrollStatus = (typeof ENROLL_STATUSES)[number];

export const PUNCH_TYPES = ['in', 'out', 'break_start', 'break_end'] as const;
export type PunchType = (typeof PUNCH_TYPES)[number];

export const VERIFY_MODES = [
  'fingerprint',
  'face',
  'rfid',
  'pin',
  'manual',
] as const;
export type VerifyMode = (typeof VERIFY_MODES)[number];

export function enumLabel(value?: string | null): string {
  return (value || '').replace(/_/g, ' ') || '—';
}

export function statusAccent(
  s: string,
): 'green' | 'red' | 'orange' | 'blue' | 'purple' | 'teal' {
  const v = (s || '').toLowerCase();
  if (v === 'active' || v === 'enrolled' || v === 'in') return 'green';
  if (v === 'maintenance' || v === 'pending' || v === 'break_start') return 'orange';
  if (v === 'faulty' || v === 'failed' || v === 'out') return 'red';
  if (v === 'inactive' || v === 'revoked' || v === 'break_end') return 'teal';
  return 'blue';
}

export function formatPunchTime(iso?: string | null): string {
  if (!iso) return '—';
  const sliced = iso.slice(0, 16);
  return sliced.replace('T', ' ');
}

export function formatEnrolledDate(iso?: string | null): string {
  if (!iso) return '—';
  return iso.slice(0, 10);
}
