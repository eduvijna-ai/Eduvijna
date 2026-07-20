import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { preprocessLatex, hasLatexContent } from '../core/utils/mathPreprocess';
import { buildAutoRenderHtml } from '../core/utils/katexWebView';
import WorksheetMathBlock from './WorksheetMathBlock';

interface MathRendererProps {
  text: string;
  colors: any;
  inline?: boolean;
}

/** Cap concurrent KaTeX WebViews in quiz screens — worksheets use WorksheetMathBlock instead. */
const MAX_CONCURRENT_MATH_WEBVIEWS = 24;
let activeMathWebViews = 0;

const releaseWebViewSlot = (slotHeld: React.MutableRefObject<boolean>) => {
  if (slotHeld.current) {
    activeMathWebViews = Math.max(0, activeMathWebViews - 1);
    slotHeld.current = false;
  }
};

/**
 * MathRenderer — plain text uses native <Text>; LaTeX uses a KaTeX WebView.
 * Pipeline matches Quiz-React MathRenderer (preprocessLatex + KaTeX auto-render).
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
    return buildAutoRenderHtml(processed, textColor, bgColor, 15);
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
    return <WorksheetMathBlock lines={[processed]} colors={colors} fontSize={15} minHeight={28} />;
  }

  const MAX_WEBVIEW_HEIGHT = 480;
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
