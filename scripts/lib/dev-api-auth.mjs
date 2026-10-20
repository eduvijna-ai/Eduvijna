/**
 * Shared dev-api login (matches mobile auth.api.ts + Quiz-React LoginPayload).
 */

const DEFAULT_API = 'https://dev-api.eduvijna.com';

export function getDevApiBase() {
  return process.env.EDUVIJNA_API_BASE || DEFAULT_API;
}

export function buildLoginPayload(usernameOrEmail, password) {
  return {
    username_or_email: usernameOrEmail,
    password,
    remember_me: false,
    device_info: 'Eduvijna technical verify script',
    client_type: 'mobile',
  };
}

export async function loginDevApi(username, password) {
  const api = getDevApiBase();
  const res = await fetch(`${api}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildLoginPayload(username, password)),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`login_non_json status=${res.status}`);
  }
  if (!res.ok) {
    throw new Error(`login_failed status=${res.status}`);
  }
  const token = body.access_token;
  if (!token) {
    throw new Error('login_missing_access_token');
  }
  const user = body.user ?? {};
  return {
    token,
    role: user.role ?? body.role ?? 'unknown',
    userId: user.id != null ? String(user.id) : 'unknown',
    username: user.username ?? username,
  };
}
