/** Shared KaTeX WebView assets — must match Quiz-React MathRenderer load order. */
export const KATEX_VERSION = '0.16.9';

export const KATEX_CSS = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.css`;
export const KATEX_JS = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.js`;
export const KATEX_AUTO_RENDER_JS = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/contrib/auto-render.min.js`;

/** Delimiters for renderMathInElement — same as web MathRenderer / auto-render defaults. */
export const KATEX_DELIMITERS_JSON = JSON.stringify([
  { left: '$$', right: '$$', display: true },
  { left: '$', right: '$', display: false },
  { left: '\\(', right: '\\)', display: false },
  { left: '\\[', right: '\\]', display: true },
]);

export function katexScriptTags(): string {
  return `<link rel="stylesheet" href="${KATEX_CSS}">
<script src="${KATEX_JS}"><\/script>
<script src="${KATEX_AUTO_RENDER_JS}"><\/script>`;
}

export function katexBaseStyles(textColor: string, bgColor: string, fontSize: number): string {
  return `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background-color: ${bgColor}; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: ${fontSize}px;
    line-height: 1.55;
    color: ${textColor};
    word-break: break-word;
    padding: 2px 0;
  }
  .katex { font-size: 1em !important; }
  .katex-display { margin: 6px 0 !important; overflow-x: auto; overflow-y: hidden; }
`;
}

/** Inject text safely then auto-render math (same technique as MathRenderer WebView). */
export function buildAutoRenderHtml(
  text: string,
  textColor: string,
  bgColor: string,
  fontSize: number,
): string {
  const jsLiteral = JSON.stringify(text);

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
${katexScriptTags()}
<style>${katexBaseStyles(textColor, bgColor, fontSize)}</style>
</head>
<body>
<div id="content"></div>
<script>
(function() {
  var rawText = ${jsLiteral};
  var el = document.getElementById('content');
  el.textContent = rawText;
  if (typeof renderMathInElement === 'function') {
    renderMathInElement(el, {
      delimiters: ${KATEX_DELIMITERS_JSON},
      throwOnError: false
    });
  }
  function postHeight() {
    window.ReactNativeWebView.postMessage(String(document.body.scrollHeight));
  }
  setTimeout(postHeight, 80);
  setTimeout(postHeight, 250);
})();
<\/script>
</body>
</html>`;
}

/** Multiple lines in one WebView — each line rendered with KaTeX. */
export function buildMultiLineAutoRenderHtml(
  lines: string[],
  textColor: string,
  bgColor: string,
  fontSize: number,
): string {
  const jsLines = JSON.stringify(lines);

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
${katexScriptTags()}
<style>
${katexBaseStyles(textColor, bgColor, fontSize)}
  .line { margin-bottom: 4px; }
  .line:last-child { margin-bottom: 0; }
</style>
</head>
<body>
<div id="content"></div>
<script>
(function() {
  var lines = ${jsLines};
  var el = document.getElementById('content');
  lines.forEach(function(line) {
    var div = document.createElement('div');
    div.className = 'line';
    div.textContent = line;
    el.appendChild(div);
  });
  if (typeof renderMathInElement === 'function') {
    renderMathInElement(el, {
      delimiters: ${KATEX_DELIMITERS_JSON},
      throwOnError: false
    });
  }
  function postHeight() {
    window.ReactNativeWebView.postMessage(String(document.body.scrollHeight));
  }
  setTimeout(postHeight, 80);
  setTimeout(postHeight, 250);
})();
<\/script>
</body>
</html>`;
}
