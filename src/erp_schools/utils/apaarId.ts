/** APAAR ID helpers — store 12 digits; display as XXXX-XXXX-XXXX (web parity). */

export function apaarDigitsOnly(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, 12);
}

export function formatApaarId(value: string | null | undefined): string {
  const digits = apaarDigitsOnly(value);
  if (!digits) return '';
  const parts: string[] = [digits.slice(0, 4)];
  if (digits.length > 4) parts.push(digits.slice(4, 8));
  if (digits.length > 8) parts.push(digits.slice(8, 12));
  return parts.join('-');
}

export function normalizeApaarId(value: string | null | undefined): string {
  return apaarDigitsOnly(value);
}

export function isValidApaarId(value: string | null | undefined): boolean {
  const digits = apaarDigitsOnly(value);
  return digits.length === 0 || digits.length === 12;
}
