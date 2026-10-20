/** Quiz-React parity: optional API string fields are "" not null/undefined. */
export function optionalApiString(value) {
  return typeof value === 'string' ? value : '';
}
