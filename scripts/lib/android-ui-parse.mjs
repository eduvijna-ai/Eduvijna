import { readFileSync } from 'node:fs';

export function parseUiTexts(xmlPath) {
  const s = readFileSync(xmlPath, 'utf8');
  const texts = new Set();
  for (const m of s.matchAll(/text="([^"]*)"/g)) {
    if (m[1].trim()) texts.add(m[1]);
  }
  for (const m of s.matchAll(/content-desc="([^"]*)"/g)) {
    if (m[1].trim()) texts.add(m[1]);
  }
  return [...texts];
}

export function findTapTarget(xmlPath, pattern) {
  const s = readFileSync(xmlPath, 'utf8');
  const re = new RegExp(
    `(?:text|content-desc|hint)="([^"]*${pattern}[^"]*)"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`,
    'i',
  );
  const m = s.match(re);
  if (!m) return null;
  return {
    label: m[1],
    x: Math.floor((Number(m[2]) + Number(m[4])) / 2),
    y: Math.floor((Number(m[3]) + Number(m[5])) / 2),
  };
}

function centerFromMatch(m) {
  return {
    x: Math.floor((Number(m[1]) + Number(m[3])) / 2),
    y: Math.floor((Number(m[2]) + Number(m[4])) / 2),
  };
}

function findBoundsForTestId(s, testId) {
  const forward = s.match(
    new RegExp(`resource-id="${testId}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`),
  );
  if (forward) return centerFromMatch(forward);
  const reverse = s.match(
    new RegExp(`bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"[^>]*resource-id="${testId}"`),
  );
  if (reverse) return centerFromMatch(reverse);
  return null;
}

export function findLoginFields(xmlPath) {
  const s = readFileSync(xmlPath, 'utf8');
  const email = findBoundsForTestId(s, 'login-email-input');
  const pass = findBoundsForTestId(s, 'login-password-input');
  const btnCenter = findBoundsForTestId(s, 'login-submit-button');
  const btn =
    (btnCenter ? { label: 'Sign in', ...btnCenter } : null) || findTapTarget(xmlPath, 'Sign in');

  if (email && pass && btn) {
    return { email, pass, btn };
  }

  const edits = [];
  for (const m of s.matchAll(
    /<node[^>]*class="android\.widget\.EditText"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*>/g,
  )) {
    const password = /password="true"/.test(m[0]);
    edits.push({
      password,
      ...centerFromMatch(m),
    });
  }
  edits.sort((a, b) => a.y - b.y);
  const emailField = edits.find((e) => !e.password) ?? edits[0];
  const passField = edits.find((e) => e.password) ?? edits[1];
  if (!emailField || !passField || !btn) return null;
  return { email: emailField, pass: passField, btn };
}

export function findPasswordField(xmlPath) {
  const s = readFileSync(xmlPath, 'utf8');
  const re =
    /password="true"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"|bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*password="true"/g;
  const m = re.exec(s);
  if (!m) return null;
  const nums = m.slice(1).map(Number).filter((n) => !Number.isNaN(n));
  if (nums.length < 4) return null;
  return {
    label: 'Password',
    x: Math.floor((nums[0] + nums[2]) / 2),
    y: Math.floor((nums[1] + nums[3]) / 2),
  };
}
