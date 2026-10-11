/**
 * Dev-only login diagnostics (no credential content). Written for engineering verification.
 */
import * as FileSystem from 'expo-file-system';

export type LoginDiagnosticEvent =
  | { type: 'focus'; field: 'email' | 'password'; at: string }
  | { type: 'change'; field: 'email' | 'password'; length: number; at: string }
  | { type: 'submit'; emailLength: number; passwordLength: number; at: string }
  | { type: 'login_request'; emailLength: number; passwordLength: number; at: string }
  | { type: 'login_result'; ok: boolean; status?: number; at: string }
  | { type: 'auth_state'; isAuthenticated: boolean; at: string };

const MAX_EVENTS = 40;

let events: LoginDiagnosticEvent[] = [];
let flushChain: Promise<void> = Promise.resolve();

function diagnosticsEnabled(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

function diagnosticsPath(): string {
  return `${FileSystem.documentDirectory}login-diagnostics.json`;
}

function scheduleFlush(): void {
  if (!diagnosticsEnabled()) return;
  flushChain = flushChain.then(async () => {
    try {
      await FileSystem.writeAsStringAsync(
        diagnosticsPath(),
        JSON.stringify({ events, updatedAt: new Date().toISOString() }, null, 0),
      );
    } catch {
      // ignore write failures in diagnostics
    }
  });
}

export function resetLoginDiagnostics(): void {
  if (!diagnosticsEnabled()) return;
  events = [];
  scheduleFlush();
}

export function recordLoginDiagnostic(event: LoginDiagnosticEvent): void {
  if (!diagnosticsEnabled()) return;
  if (typeof console !== 'undefined' && console.log) {
    console.log(`LOGIN_DIAG ${JSON.stringify(event)}`);
  }
  events.push(event);
  if (events.length > MAX_EVENTS) {
    events = events.slice(-MAX_EVENTS);
  }
  scheduleFlush();
}

export async function clearLoginDiagnosticsFile(): Promise<void> {
  if (!diagnosticsEnabled()) return;
  try {
    await FileSystem.deleteAsync(diagnosticsPath(), { idempotent: true });
  } catch {
    // ignore
  }
  events = [];
}
