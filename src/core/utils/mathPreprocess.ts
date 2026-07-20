/**
 * Shared LaTeX preprocessing — aligned with Quiz-React MathRenderer.
 * Fixes double-escaped backslashes and wraps bare LaTeX for KaTeX auto-render.
 */
export function preprocessLatex(text: string): string {
  if (!text) return '';

  let processed = text.replace(/\\\\([a-zA-Z{,;!> ])/g, '\\$1');

  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_m, c) => `$${String(c).trim()}$`);
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_m, c) => `$$${String(c).trim()}$$`);

  processed = processed.replace(
    /\[\s*([^\]]*(?:\\[a-zA-Z]+|\^{|_{)[^\]]*)\s*\](?!\()/g,
    (_m, c) => `$$${String(c).trim()}$$`,
  );

  if (/\$/.test(processed)) {
    return processed;
  }

  const LATEX_TOKEN_RE = /\\[a-zA-Z]+|[_^]\{/;
  if (!LATEX_TOKEN_RE.test(processed)) {
    return processed;
  }

  const stripped = processed
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[{}_^|\\]/g, ' ');
  const hasProse = /\b[a-zA-Z]{3,}\b/.test(stripped);

  if (!hasProse) {
    return `$${processed.trim()}$`;
  }

  return wrapEmbeddedLatex(processed);
}

function wrapEmbeddedLatex(text: string): string {
  const parts = text.split(/(\s+)/);
  let out = '';
  let mathBuf = '';

  const flushMath = () => {
    if (mathBuf.trim()) {
      out += `$${mathBuf.trim()}$`;
      mathBuf = '';
    }
  };

  const isLatexToken = (token: string) =>
    /\\[a-zA-Z]+/.test(token) || /[_^]\{/.test(token) || /^[A-Za-z0-9+\-*/=()[\]{}.,]+$/.test(token) && /\\/.test(token);

  for (const part of parts) {
    if (/^\s+$/.test(part)) {
      if (mathBuf) mathBuf += part;
      else out += part;
      continue;
    }

    if (isLatexToken(part) || (mathBuf && /^[0-9A-Za-z+\-*/=()[\]{}.,^_{}\\]+$/.test(part))) {
      mathBuf += (mathBuf && !mathBuf.endsWith(' ') ? ' ' : '') + part;
    } else {
      flushMath();
      out += part;
    }
  }
  flushMath();
  return out;
}

export function hasLatexContent(text: string): boolean {
  const processed = preprocessLatex(text);
  return /\\[a-zA-Z]+|\$|\^|\{.*\}|_\{/.test(processed);
}
