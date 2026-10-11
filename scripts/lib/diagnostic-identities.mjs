/**
 * Parse TypeScript / ESLint diagnostics into stable identities (file + code + message).
 */

export function normalizeRelativeFilePath(filePath) {
  return String(filePath)
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^src\//, '');
}

export function normalizeRepoFilePath(filePath, repoRoot) {
  const fp = String(filePath).replace(/\\/g, '/');
  const root = String(repoRoot || '')
    .replace(/\\/g, '/')
    .replace(/\/$/, '');
  if (root && fp.startsWith(`${root}/`)) {
    return fp.slice(root.length + 1);
  }
  const worktreeMarker = '/.stack-worktrees/';
  const idx = fp.indexOf(worktreeMarker);
  if (idx >= 0) {
    const after = fp.slice(idx + worktreeMarker.length);
    const slash = after.indexOf('/');
    if (slash >= 0) {
      return after.slice(slash + 1);
    }
  }
  return normalizeRelativeFilePath(fp);
}

export function parseTypeScriptDiagnosticLine(line) {
  const match = line.match(/^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.*)$/);
  if (!match) {
    return null;
  }
  const file = normalizeRelativeFilePath(match[1]);
  const code = match[4];
  const message = match[5].trim();
  return {
    file,
    line: Number(match[2]),
    column: Number(match[3]),
    code,
    message,
    identity: `${file}|${code}|${message}`,
  };
}

export function collectTypeScriptIdentities(output) {
  const identities = new Set();
  for (const line of String(output).split('\n')) {
    const parsed = parseTypeScriptDiagnosticLine(line);
    if (parsed) {
      identities.add(parsed.identity);
    }
  }
  return [...identities].sort();
}

export function diffIdentities(headIdentities, baseIdentities) {
  const base = new Set(baseIdentities);
  return headIdentities.filter((id) => !base.has(id));
}

export function parseEslintJsonReport(jsonText, repoRoot = '') {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  const identities = new Set();
  for (const fileResult of parsed) {
    const filePath = normalizeRepoFilePath(fileResult.filePath || '', repoRoot);
    for (const message of fileResult.messages ?? []) {
      if (message.severity !== 2) {
        continue;
      }
      const ruleId = message.ruleId || 'eslint/unknown';
      const text = String(message.message || '').trim();
      const line = message.line ?? 0;
      const column = message.column ?? 0;
      identities.add(`${filePath}|${ruleId}|${text}|${line}:${column}`);
    }
  }
  return [...identities].sort();
}
