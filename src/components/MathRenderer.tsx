import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface MathRendererProps {
  text: string;
  colors: any;
  inline?: boolean;
}

/**
 * Mirrors the preprocessLatex logic from the working web MathRenderer.
 * Fixes double-escaped backslashes from API JSON serialization and
 * converts legacy \(...\) / \[...\] delimiters to $ / $$.
 */
const preprocessLatex = (text: string): string => {
  if (!text) return '';

  // Fix double-escaped backslashes: \\frac → \frac  etc.
  let processed = text.replace(/\\\\([a-zA-Z{,;!> ])/g, '\\$1');

  // Convert \(...\) → $...$ and \[...\] → $$...$$
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_m, c) => `$${c}$`);
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_m, c) => `$$${c}$$`);

  // If already has $ delimiters or bare LaTeX commands, return as-is for KaTeX
  if (/\$/.test(processed)) return processed;

  const hasLatex = /\\[a-zA-Z]+|[_^]\{/.test(processed);
  if (!hasLatex) return processed;

  // Wrap bare LaTeX
  const lines = processed.split('\n').filter(l => l.trim());
  if (lines.length <= 1 && processed.length < 150) return `$${processed}$`;
  return `$$\n${processed}\n$$`;
};

/**
 * Returns true if the text contains any LaTeX/math notation that needs
 * KaTeX rendering. Plain text is rendered with a regular <Text> node.
 */
const hasLatexContent = (text: string): boolean => {
  return /\\[a-zA-Z]+|\$|\^|\{.*\}|_\{/.test(text);
};

/**
 * Generates a self-contained HTML page that renders a KaTeX expression.
 *
 * KEY: JSON.stringify embeds the LaTeX text as a valid JS string literal.
 * Example: text = "$\\frac{1}{2}$"
 *   JSON.stringify → '"$\\\\frac{1}{2}$"'   (valid JS literal)
 *   Browser eval  → "$\\frac{1}{2}$"        (single backslash — correct for KaTeX)
 *
 * This avoids the backtick-wrapping / double-escape bugs that caused
 * raw LaTeX commands to appear as plain text.
 */
const buildKatexHtml = (
  text: string,
  textColor: string,
  bgColor: string,
  fontSize: number,
): string => {
  // Produces a ready-to-eval JS string literal, e.g. "\"$\\\\frac{1}{2}$\""
  const jsLiteral = JSON.stringify(text);

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"><\/script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background-color: ${bgColor}; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: ${fontSize}px;
    line-height: 1.6;
    color: ${textColor};
    word-break: break-word;
    padding: 2px 0;
  }
  .katex { font-size: 1em !important; }
  .katex-display { margin: 6px 0 !important; overflow-x: auto; overflow-y: hidden; }
<\/style>
</head>
<body>
<div id="content"></div>
<script>
(function() {
  var rawText = ${jsLiteral};
  var el = document.getElementById('content');
  // textContent sets a plain text node; renderMathInElement then finds
  // the $...$ delimiters in that text node and replaces them with KaTeX.
  el.textContent = rawText;
  renderMathInElement(el, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$',  right: '$',  display: false }
    ],
    throwOnError: false
  });
  // Delay slightly so KaTeX has time to finish layout before we measure.
  setTimeout(function() {
    window.ReactNativeWebView.postMessage(String(document.body.scrollHeight));
  }, 80);
})();
<\/script>
</body>
</html>`;
};

/**
 * MathRenderer Component for React Native
 *
 * Uses the exact same preprocessLatex logic as the working web version.
 * Plain text is rendered with a fast native <Text> node.
 * Text containing LaTeX/math is rendered via a KaTeX WebView for pixel-
 * perfect mathematical notation — identical to what the web app shows.
 *
 * Performance: WebView is only mounted when LaTeX is detected. Memoized
 * HTML prevents unnecessary re-renders.
 */
const MathRenderer: React.FC<MathRendererProps> = ({
  text,
  colors,
  // inline prop kept for API compatibility but WebView renders correctly in all contexts
  inline: _inline = false,
}) => {
  if (!text) return null;

  const processed = useMemo(() => preprocessLatex(text), [text]);
  const needsKatex = useMemo(() => hasLatexContent(processed), [processed]);

  // Height of the WebView, reported by the page after rendering
  const [webViewHeight, setWebViewHeight] = useState(28);

  const htmlContent = useMemo(() => {
    if (!needsKatex) return '';
    return buildKatexHtml(processed, colors.text, colors.card, 15);
  }, [needsKatex, processed, colors.text, colors.card]);

  if (!needsKatex) {
    // Fast path: no math — plain native text render
    return (
      <Text style={[styles.plainText, { color: colors.text }]}>
        {processed}
      </Text>
    );
  }

  return (
    <View style={[styles.webViewWrapper, { height: webViewHeight }]}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.webView}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        onMessage={(event) => {
          const h = parseInt(event.nativeEvent.data, 10);
          if (!isNaN(h) && h > 0) setWebViewHeight(h);
        }}
        originWhitelist={['*']}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  plainText: {
    fontSize: 15,
    lineHeight: 22,
  },
  webViewWrapper: {
    width: '100%',
    minHeight: 28,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default MathRenderer;
