import {
  collectUiTexts,
  isEduvijnaAppForeground,
  locateByLabel,
  parseUiXml,
} from './android-journey-logic.mjs';

/** @typedef {'development_servers'|'developer_menu'|'push_notification'|'anr_dialog'|'bundle_error'|'login_in_progress'|'login_form'|'authenticated_shell'|'outside_app'|'unknown_in_app'} AndroidRuntimeScreenState */

/**
 * @param {string} content
 * @returns {AndroidRuntimeScreenState}
 */
export function classifyAndroidRuntimeScreen(content) {
  const nodes = parseUiXml(content);
  const texts = collectUiTexts(nodes);

  if (texts.some((t) => /developer menu/i.test(t))) {
    return 'developer_menu';
  }
  if (texts.some((t) => /Enable Push Notifications/i.test(t))) {
    return 'push_notification';
  }
  if (texts.some((t) => /isn't responding|not responding/i.test(t))) {
    return 'anr_dialog';
  }
  if (texts.some((t) => /DEVELOPMENT SERVERS/i.test(t)) || texts.some((t) => /New development server/i.test(t))) {
    return 'development_servers';
  }
  if (!isEduvijnaAppForeground(content)) {
    if (texts.some((t) => /EduVijna|Development Build/i.test(t))) {
      return 'development_servers';
    }
    if (texts.some((t) => /EduVijna/i.test(t))) return 'outside_app';
    return 'outside_app';
  }
  if (texts.some((t) => /problem loading the project/i.test(t))) return 'bundle_error';
  if (
    texts.some((t) => /Sign in/i.test(t)) ||
    nodes.some((n) => (n['resource-id'] || '') === 'login-email-input')
  ) {
    return 'login_form';
  }
  if (
    locateByLabel(nodes, 'Assessments', { minY: 0 }) ||
    locateByLabel(nodes, 'Analytics', { minY: 0 }) ||
    locateByLabel(nodes, 'Go to main dashboard', { minY: 0 }) ||
    (texts.some((t) => /^Home$/i.test(t)) &&
      texts.some((u) => /Assessments|Analytics|Dashboard/i.test(u)))
  ) {
    return 'authenticated_shell';
  }
  if (texts.some((t) => /Signing in|Loading/i.test(t))) return 'login_in_progress';
  if (texts.some((t) => /invalid|incorrect|failed/i.test(t))) return 'unknown_in_app';
  return 'unknown_in_app';
}

export function isAcceptablePreLoginScreen(screen) {
  return screen === 'login_form' || screen === 'authenticated_shell';
}
