import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface MathRendererProps {
  text: string;
  colors: any;
  inline?: boolean;
}

/** Cap concurrent KaTeX WebViews — too many crash Android from OOM. */
const MAX_CONCURRENT_MATH_WEBVIEWS = 10;
let activeMathWebViews = 0;

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

const MAX_WEBVIEW_HEIGHT = 480;

/**
 * Generates a self-contained HTML page that renders a KaTeX expression.
 */
const buildKatexHtml = (
  text: string,
  textColor: string,
  bgColor: string,
  fontSize: number,
): string => {
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
  el.textContent = rawText;
  renderMathInElement(el, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$',  right: '$',  display: false }
    ],
    throwOnError: false
  });
  setTimeout(function() {
    window.ReactNativeWebView.postMessage(String(document.body.scrollHeight));
  }, 80);
})();
<\/script>
</body>
</html>`;
};

const releaseWebViewSlot = (slotHeld: React.MutableRefObject<boolean>) => {
  if (slotHeld.current) {
    activeMathWebViews = Math.max(0, activeMathWebViews - 1);
    slotHeld.current = false;
  }
};

/**
 * MathRenderer — plain text uses native <Text>; LaTeX uses a KaTeX WebView.
 * WebView instances are capped to avoid Android OOM crashes on dense screens.
 */
const MathRenderer: React.FC<MathRendererProps> = ({
  text,
  colors,
  inline: _inline = false,
}) => {
  const safeText = text ?? '';
  const processed = useMemo(() => preprocessLatex(safeText), [safeText]);
  const needsKatex = useMemo(
    () => safeText.length > 0 && hasLatexContent(processed),
    [safeText, processed],
  );

  const [webViewHeight, setWebViewHeight] = useState(28);
  const [webViewEnabled, setWebViewEnabled] = useState(false);
  const slotHeld = useRef(false);

  const textColor = colors?.text ?? '#111827';
  const bgColor = colors?.card ?? colors?.background ?? '#ffffff';

  const htmlContent = useMemo(() => {
    if (!needsKatex) return '';
    return buildKatexHtml(processed, textColor, bgColor, 15);
  }, [needsKatex, processed, textColor, bgColor]);

  useEffect(() => {
    if (!needsKatex) {
      releaseWebViewSlot(slotHeld);
      setWebViewEnabled(false);
      return undefined;
    }

    if (!slotHeld.current && activeMathWebViews < MAX_CONCURRENT_MATH_WEBVIEWS) {
      activeMathWebViews += 1;
      slotHeld.current = true;
      setWebViewEnabled(true);
    } else if (!slotHeld.current) {
      setWebViewEnabled(false);
    }

    return () => {
      releaseWebViewSlot(slotHeld);
    };
  }, [needsKatex]);

  if (!safeText) return null;

  if (!needsKatex) {
    return (
      <Text style={[styles.plainText, { color: textColor }]}>
        {processed}
      </Text>
    );
  }

  if (!webViewEnabled) {
    return (
      <Text style={[styles.plainText, { color: textColor }]}>
        {processed}
      </Text>
    );
  }

  const cappedHeight = Math.min(webViewHeight, MAX_WEBVIEW_HEIGHT);

  return (
    <View style={[styles.webViewWrapper, { height: cappedHeight }]}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.webView}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        cacheEnabled={false}
        javaScriptEnabled
        domStorageEnabled={false}
        androidLayerType="hardware"
        onMessage={(event) => {
          const h = parseInt(event.nativeEvent.data, 10);
          if (!isNaN(h) && h > 0) {
            setWebViewHeight(Math.min(h, MAX_WEBVIEW_HEIGHT));
          }
        }}
        onRenderProcessGone={() => {
          releaseWebViewSlot(slotHeld);
          setWebViewEnabled(false);
          return true;
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
