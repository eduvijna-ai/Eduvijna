/**
 * Parse TypeScript / ESLint diagnostics into stable identities (file + code + message).
 */

export function normalizeRelativeFilePath(filePath) {
  return String(filePath)
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^src\//, '');
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
