/**
 * Local error log — persists recent errors to AsyncStorage for debugging
 * when Sentry is not configured. Also prints structured logs to Metro / logcat.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY = '@eduvijna_error_log';
const MAX_ENTRIES = 40;

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  componentStack?: string;
  context?: string;
  platform: string;
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readEntries(): Promise<ErrorLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeEntries(entries: ErrorLogEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch (e) {
    console.warn('[EduVijna ErrorLogger] Failed to persist error log:', e);
  }
}

export async function logError(
  error: unknown,
  context?: string,
  extra?: { componentStack?: string },
): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error));
  const entry: ErrorLogEntry = {
    id: newId(),
    timestamp: new Date().toISOString(),
    message: err.message || 'Unknown error',
    stack: err.stack,
    componentStack: extra?.componentStack,
    context,
    platform: Platform.OS,
  };

  console.error(
    `[EduVijna Error]${context ? ` [${context}]` : ''}`,
    entry.message,
    '\nStack:', entry.stack ?? '(none)',
    extra?.componentStack ? `\nComponent stack: ${extra.componentStack}` : '',
  );

  const existing = await readEntries();
  await writeEntries([entry, ...existing]);
}

export async function getRecentErrors(): Promise<ErrorLogEntry[]> {
  return readEntries();
}

/** Dev helper: inspect in Metro console via `global.__eduvijnaGetErrors()` */
if (__DEV__) {
  (global as any).__eduvijnaGetErrors = getRecentErrors;
  (global as any).__eduvijnaClearErrors = clearErrorLog;
}

export async function clearErrorLog(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/** Install RN global JS error + unhandled promise rejection handlers. */
export function installGlobalErrorHandlers(): void {
  const g = global as typeof globalThis & {
    ErrorUtils?: {
      getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void;
      setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
    };
    HermesInternal?: unknown;
  };

  const errorUtils = g.ErrorUtils;
  if (errorUtils?.setGlobalHandler && errorUtils?.getGlobalHandler) {
    const defaultHandler = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      void logError(error, isFatal ? 'fatal-js' : 'js-global');
      defaultHandler?.(error, isFatal);
    });
  }

  const rejectionHandler = (event: PromiseRejectionEvent | { reason?: unknown }) => {
    const reason = 'reason' in event ? event.reason : event;
    void logError(reason, 'unhandled-promise');
  };

  if (typeof globalThis.addEventListener === 'function') {
    globalThis.addEventListener('unhandledrejection', rejectionHandler as EventListener);
  }
}
