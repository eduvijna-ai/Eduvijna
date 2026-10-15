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
  for (const marker of ['/.stack-worktrees/', '/.stack-validation-logs/']) {
    const idx = fp.indexOf(marker);
    if (idx >= 0) {
      const after = fp.slice(idx + marker.length);
      const slash = after.indexOf('/');
      if (slash >= 0) {
        return after.slice(slash + 1);
      }
    }
  }
  return normalizeRelativeFilePath(fp);
}

export function parseTypeScriptDiagnosticLine(line) {
  const normalizedLine = String(line).replace(/\r$/, '');
  const match = normalizedLine.match(/^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.*)$/);
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
  /** @type {string[]} */
  const identities = [];
  for (const line of String(output).split('\n')) {
    const trimmed = line.replace(/\r$/, '');
    if (!trimmed.trim()) {
      continue;
    }
    const parsed = parseTypeScriptDiagnosticLine(trimmed);
    if (parsed) {
      identities.push(parsed.identity);
    }
  }
  return identities.sort();
}

export function diffIdentities(headIdentities, baseIdentities) {
  const base = new Set(baseIdentities);
  return headIdentities.filter((id) => !base.has(id));
}

/** ESLint identity without line/column — used to detect line-shift relocations across worktrees. */
export function eslintRelocationKey(identity) {
  const parts = String(identity).split('|');
  if (parts.length < 4) {
    return identity;
  }
  return parts.slice(0, 3).join('|');
}

/** TypeScript identities already exclude line/column. */
export function typescriptRelocationKey(identity) {
  return identity;
}

function countByKey(identities, keyFn) {
  const counts = new Map();
  for (const id of identities) {
    const key = keyFn(id);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

/**
 * Classify diagnostic delta while preserving multiplicity in the raw identity lists.
 * - unchanged: identical full identity in head and base
 * - resolved: in base, not in head (by full identity)
 * - relocated: in head only, but relocation key exists in base (typically line shift / checkout path)
 * - genuinelyIntroduced: relocation key not in base, or more occurrences than base for that key
 * - ambiguous: same relocation key with multiple distinct full identities in head vs base counts (needs review)
 */
function multisetDrain(pool) {
  const out = [];
  for (const [identity, count] of pool.entries()) {
    for (let i = 0; i < count; i += 1) out.push(identity);
  }
  return out;
}

export function classifyDiagnosticDelta(headIdentities, baseIdentities, kind = 'typescript') {
  const keyFn = kind === 'eslint' ? eslintRelocationKey : typescriptRelocationKey;
  const baseKeyOriginal = countByKey(baseIdentities, keyFn);

  const headPool = countByKey(headIdentities, (id) => id);
  const basePool = countByKey(baseIdentities, (id) => id);

  const unchanged = [];
  for (const id of new Set(headIdentities)) {
    const take = Math.min(headPool.get(id) || 0, basePool.get(id) || 0);
    for (let i = 0; i < take; i += 1) unchanged.push(id);
    headPool.set(id, (headPool.get(id) || 0) - take);
    basePool.set(id, (basePool.get(id) || 0) - take);
  }

  const headRemaining = multisetDrain(headPool);
  const baseRemaining = multisetDrain(basePool);

  const relocationBudget = countByKey(baseIdentities, keyFn);
  for (const id of unchanged) {
    const key = keyFn(id);
    relocationBudget.set(key, (relocationBudget.get(key) || 0) - 1);
  }

  const relocated = [];
  const genuinelyIntroduced = [];
  const ambiguous = [];

  for (const id of headRemaining) {
    const key = keyFn(id);
    const budget = relocationBudget.get(key) || 0;
    if (budget > 0) {
      relocated.push(id);
      relocationBudget.set(key, budget - 1);
      continue;
    }
    genuinelyIntroduced.push(id);
    if ((baseKeyOriginal.get(key) || 0) > 0) {
      ambiguous.push(id);
    }
  }

  const resolved = [...baseRemaining];
  for (const [key, count] of relocationBudget.entries()) {
    for (let i = 0; i < count; i += 1) {
      resolved.push(`__relocation_key__:${key}`);
    }
  }

  return {
    unchanged,
    resolved: baseRemaining,
    relocated,
    genuinelyIntroduced,
    ambiguous,
    counts: {
      unchanged: unchanged.length,
      resolved: baseRemaining.length,
      relocated: relocated.length,
      genuinelyIntroduced: genuinelyIntroduced.length,
      ambiguous: ambiguous.length,
    },
  };
}

export function diffGenuineIdentities(headIdentities, baseIdentities, kind = 'typescript') {
  return classifyDiagnosticDelta(headIdentities, baseIdentities, kind).genuinelyIntroduced;
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
  /** @type {string[]} */
  const identities = [];
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
      identities.push(`${filePath}|${ruleId}|${text}|${line}:${column}`);
    }
  }
  return identities.sort();
}
