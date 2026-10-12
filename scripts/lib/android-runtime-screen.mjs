import {
  collectUiTexts,
  isEduvijnaAppForeground,
  locateByLabel,
  parseUiXml,
} from './android-journey-logic.mjs';

export function classifyAndroidRuntimeScreen(content) {
  const nodes = parseUiXml(content);
  const texts = collectUiTexts(nodes);
  if (texts.some((t) => /developer menu/i.test(t))) {
    return 'dev_client_shell';
  }
  if (!isEduvijnaAppForeground(content)) {
    if (texts.some((t) => /EduVijna|Development Build|DEVELOPMENT SERVERS/i.test(t))) {
      return 'dev_client_shell';
    }
    if (texts.some((t) => /EduVijna/i.test(t))) return 'launcher_icon';
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
  if (texts.some((t) => /invalid|incorrect|failed/i.test(t))) return 'credential_rejected_ui';
  return 'unknown_in_app';
}

export function isAcceptablePreLoginScreen(screen) {
  return screen === 'login_form' || screen === 'authenticated_shell';
}
