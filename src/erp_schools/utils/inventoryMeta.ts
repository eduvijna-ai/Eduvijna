/**
 * Inventory constants — mirror web InventoryTab dropdowns / filters.
 * Quiz-React: components/ERPManagement/tabs/InventoryTab.tsx
 */

export const ITEM_CATEGORIES = [
  'furniture',
  'electronics',
  'stationery',
  'sports',
  'lab_equipment',
  'books',
  'cleaning',
  'kitchen',
  'medical',
  'general',
  'other',
] as const;

export const ITEM_UNITS = [
  'piece',
  'kg',
  'litre',
  'box',
  'set',
  'bundle',
  'ream',
  'packet',
  'other',
] as const;

export const PO_STATUSES = [
  'draft',
  'submitted',
  'approved',
  'ordered',
  'received',
  'partial',
  'cancelled',
] as const;

export const MOVEMENT_TYPES = [
  'purchase',
  'issue',
  'return',
  'adjustment',
  'damage',
  'transfer',
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];
export type ItemUnit = (typeof ITEM_UNITS)[number];
export type POStatus = (typeof PO_STATUSES)[number];
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export function categoryLabel(c: string): string {
  return c.replace(/_/g, ' ');
}

export function currencyInr(n: number): string {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

export function poStatusAccent(
  s: string,
): 'teal' | 'purple' | 'green' | 'orange' | 'red' | 'blue' {
  const v = s.toLowerCase();
  if (v === 'approved' || v === 'received') return 'green';
  if (v === 'submitted') return 'purple';
  if (v === 'ordered' || v === 'partial') return 'orange';
  if (v === 'cancelled') return 'red';
  if (v === 'draft') return 'teal';
  return 'blue';
}

export function movementTypeAccent(
  t: string,
): 'green' | 'red' | 'orange' | 'purple' | 'teal' | 'blue' {
  const v = t.toLowerCase();
  if (v === 'purchase') return 'green';
  if (v === 'issue') return 'red';
  if (v === 'adjustment') return 'orange';
  if (v === 'return') return 'purple';
  if (v === 'damage') return 'teal';
  if (v === 'transfer') return 'purple';
  return 'blue';
}

export function movementDateLabel(movementDate?: string, createdAt?: string): string {
  const raw = movementDate || createdAt || '';
  if (!raw) return '—';
  return raw.includes('T') ? raw.split('T')[0] : raw;
}
