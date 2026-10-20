/**
 * Active API environment for this app build / Metro session (from app.config extra).
 */

import Constants from 'expo-constants';
import {
  parseApiEnvironment,
  resolveApiEnvironmentFromProcess,
  type ApiEnvironment,
} from './apiEnvironment';

export function resolveActiveApiEnvironment(): ApiEnvironment {
  const fromExtra = Constants.expoConfig?.extra?.EDUVIJNA_API_ENV;
  if (typeof fromExtra === 'string' && fromExtra.trim()) {
    return parseApiEnvironment(fromExtra.trim());
  }
  return resolveApiEnvironmentFromProcess(
    typeof process !== 'undefined' && process.env ? process.env : {},
  );
}
