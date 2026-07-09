/**
 * MCQ question + options in ONE KaTeX WebView with tap-to-select via postMessage.
 * Uses the same KaTeX load order as MathRenderer (katex.min.js + auto-render).
 */
import React, { useMemo, useState, useCallback, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { preprocessLatex } from '../core/utils/mathPreprocess';
import { normalizeMcqOptionText } from '../core/utils/optionLabelUtils';
import { katexScriptTags, KATEX_DELIMITERS_JSON } from '../core/utils/katexWebView';

interface Props {
  questionNumber: number;
  question: string;
  options: string[];
  selected: string;
  onSelect: (letter: string) => void;
  disabled?: boolean;
  colors: { text?: string; card?: string; background?: string; primary?: string; border?: string };
}

function buildMcqHtml(
  questionNumber: number,
  question: string,
  options: string[],
  selected: string,
  disabled: boolean,
  textColor: string,
  bgColor: string,
  primaryColor: string,
): string {
  const payload = JSON.stringify({
    questionNumber,
    question: preprocessLatex(question),
    options: options.map((opt, i) => ({
      letter: String.fromCharCode(65 + i),
      text: preprocessLatex(normalizeMcqOptionText(opt, i, 'prefixed')),
    })),
    selected,
    disabled,
    primaryColor,
    textColor,
    bgColor,
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
${katexScriptTags()}
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { background:${bgColor}; color:${textColor}; font-family:-apple-system,BlinkMacSystemFont,sans-serif; font-size:14px; line-height:1.5; }
  .question { font-weight:600; margin-bottom:10px; }
  .opt {
    display:flex; align-items:flex-start; gap:8px;
    padding:8px; margin-bottom:6px; border-radius:8px; border:1px solid #e5e7eb;
    cursor:pointer;
  }
  .radio {
    width:18px; height:18px; border-radius:9px; border:2px solid #9ca3af;
    display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;
  }
  .radio-inner { width:10px; height:10px; border-radius:5px; }
  .opt-body { flex:1; }
  .katex { font-size:1em !important; }
  .katex-display { margin:4px 0 !important; overflow-x:auto; }
</style>
</head>
<body>
<div id="root"></div>
<script>
(function() {
  var data = ${payload};
  var root = document.getElementById('root');

  var qDiv = document.createElement('div');
  qDiv.className = 'question';
  var qLabel = document.createElement('b');
  qLabel.textContent = 'Q' + data.questionNumber + '. ';
  qDiv.appendChild(qLabel);
  var qText = document.createElement('span');
  qText.textContent = data.question;
  qDiv.appendChild(qText);
  root.appendChild(qDiv);

  var optsWrap = document.createElement('div');
  optsWrap.className = 'options';

  data.options.forEach(function(opt) {
    var isSelected = data.selected === opt.letter;
    var selBg = isSelected ? '#eff6ff' : 'transparent';
    var selBorder = isSelected ? '#93c5fd' : '#e5e7eb';
    var radioBorder = isSelected ? data.primaryColor : '#9ca3af';
    var radioFill = isSelected ? data.primaryColor : 'transparent';

    var el = document.createElement('div');
    el.className = 'opt';
    el.setAttribute('data-letter', opt.letter);
    el.style.background = selBg;
    el.style.borderColor = selBorder;

    var radio = document.createElement('span');
    radio.className = 'radio';
    radio.style.borderColor = radioBorder;
    var radioInner = document.createElement('span');
    radioInner.className = 'radio-inner';
    radioInner.style.background = radioFill;
    radio.appendChild(radioInner);

    var body = document.createElement('span');
    body.className = 'opt-body';
    var letter = document.createElement('b');
    letter.textContent = opt.letter + '. ';
    body.appendChild(letter);
    var optText = document.createElement('span');
    optText.textContent = opt.text;
    body.appendChild(optText);

    el.appendChild(radio);
    el.appendChild(body);
    optsWrap.appendChild(el);

    el.addEventListener('click', function() {
      if (data.disabled) return;
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'select', letter: opt.letter }));
    });
  });

  root.appendChild(optsWrap);

  function renderMath() {
    if (typeof renderMathInElement !== 'function') return;
    renderMathInElement(root, {
      delimiters: ${KATEX_DELIMITERS_JSON},
      throwOnError: false
    });
  }

  function postHeight() {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'height', value: document.body.scrollHeight }));
  }

  renderMath();
  setTimeout(function() { renderMath(); postHeight(); }, 80);
  setTimeout(postHeight, 250);
})();
<\/script>
</body>
</html>`;
}

export default function WorksheetMcqCard({
  questionNumber,
  question,
  options,
  selected,
  onSelect,
  disabled = false,
  colors,
}: Props) {
  const [height, setHeight] = useState(120);
  const webRef = useRef<WebView>(null);

  const textColor = colors?.text ?? '#111827';
  const bgColor = colors?.card ?? colors?.background ?? '#ffffff';
  const primaryColor = colors?.primary ?? '#0891b2';

  const html = useMemo(
    () => buildMcqHtml(questionNumber, question, options, selected, disabled, textColor, bgColor, primaryColor),
    [questionNumber, question, options, selected, disabled, textColor, bgColor, primaryColor],
  );

  const onMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'height' && data.value > 0) {
          setHeight(Math.min(data.value + 8, 800));
        } else if (data.type === 'select' && data.letter && !disabled) {
          onSelect(data.letter);
        }
      } catch {
        const h = parseInt(event.nativeEvent.data, 10);
        if (!isNaN(h) && h > 0) setHeight(Math.min(h + 8, 800));
      }
    },
    [disabled, onSelect],
  );

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        key={`${selected}-${disabled}`}
        ref={webRef}
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
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
  wrap: { width: '100%', minHeight: 80 },
  webview: { flex: 1, backgroundColor: 'transparent' },
});
