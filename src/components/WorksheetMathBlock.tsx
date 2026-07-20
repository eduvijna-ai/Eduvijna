/**
 * Renders LaTeX/markdown lines in a single KaTeX WebView.
 * Shares the same pipeline as MathRenderer (katex.min.js + auto-render + preprocessLatex).
 */
import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { preprocessLatex } from '../core/utils/mathPreprocess';
import { buildMultiLineAutoRenderHtml } from '../core/utils/katexWebView';

interface Props {
  lines: string[];
  colors: { text?: string; card?: string; background?: string };
  fontSize?: number;
  minHeight?: number;
}

export default function WorksheetMathBlock({ lines, colors, fontSize = 14, minHeight = 24 }: Props) {
  const safeLines = useMemo(
    () => lines.filter((l) => l != null && String(l).trim()).map((l) => preprocessLatex(String(l))),
    [lines],
  );
  const [height, setHeight] = useState(minHeight);

  const textColor = colors?.text ?? '#111827';
  const bgColor = colors?.card ?? colors?.background ?? '#ffffff';

  const html = useMemo(
    () => (safeLines.length ? buildMultiLineAutoRenderHtml(safeLines, textColor, bgColor, fontSize) : ''),
    [safeLines, textColor, bgColor, fontSize],
  );

  const onMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      const h = parseInt(event.nativeEvent.data, 10);
      if (!isNaN(h) && h > 0) {
        setHeight(Math.max(minHeight, Math.min(h + 4, 600)));
      }
    },
    [minHeight],
  );

  if (!safeLines.length || !html) return null;

  return (
    <View style={[styles.wrap, { height, minHeight }]}>
      <WebView
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        javaScriptEnabled
        domStorageEnabled={false}
        originWhitelist={['*']}
        androidLayerType="hardware"
        onMessage={onMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  webview: { flex: 1, backgroundColor: 'transparent' },
});
