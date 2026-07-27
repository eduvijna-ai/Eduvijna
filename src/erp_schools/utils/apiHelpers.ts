/**
 * Shared helpers for erp_schools data seams (framework-agnostic).
 */

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export function extractErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (err instanceof Error && err.message) return err.message;
  const anyErr = err as {
    message?: string;
    response?: { data?: { detail?: unknown; message?: string; error?: string } };
  };
  const detail = anyErr?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  if (anyErr?.response?.data?.message) return String(anyErr.response.data.message);
  if (anyErr?.response?.data?.error) return String(anyErr.response.data.error);
  if (anyErr?.message) return String(anyErr.message);
  return fallback;
}

/** Normalize list payloads from FastAPI / paginated ERP responses. */
export function safeList<T = Record<string, unknown>>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
    const nested = obj.data as Record<string, unknown> | undefined;
    if (nested && Array.isArray(nested.items)) return nested.items as T[];
    if (Array.isArray(obj.results)) return obj.results as T[];
  }
  return [];
}

export function settledValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === 'fulfilled' ? result.value : fallback;
}

export function toLocalDateStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfAcademicWindow(monthsBack = 10): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsBack);
  return toLocalDateStr(d);
}

export function formatDisplayDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDisplayTime(isoOrTime?: string | null): string {
  if (!isoOrTime) return '';
  if (/^\d{1,2}:\d{2}/.test(isoOrTime)) {
    const [hStr, mStr] = isoOrTime.split(':');
    let h = Number(hStr);
    const m = mStr?.slice(0, 2) ?? '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }
  const d = new Date(isoOrTime);
  if (Number.isNaN(d.getTime())) return String(isoOrTime);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function pickString(...vals: unknown[]): string {
  for (const v of vals) {
    if (v !== null && v !== undefined && String(v).trim() !== '') return String(v);
  }
  return '';
}

export function pickNumber(...vals: unknown[]): number {
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}
