import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MathRendererProps {
  text: string;
  colors: any;
  inline?: boolean;
}

/**
 * MathRenderer Component for React Native
 * 
 * Renders text with Markdown and LaTeX math formatting support.
 * Handles bold text, bullet points, line breaks, and LaTeX math expressions.
 * 
 * Supported Syntax:
 * - Bold: **text**
 * - Bullet points: * item
 * - Line breaks: \n
 * - Inline math: \(...\) or $...$
 * - Display math: \[...\] or $$...$$
 * 
 * @param text - The text/markdown/LaTeX content to render
 * @param colors - Theme colors from useGlobalStyles
 * @param inline - If true, renders inline (default: false)
 */
const MathRenderer: React.FC<MathRendererProps> = ({ 
  text, 
  colors,
  inline = false 
}) => {
  if (!text) return null;

  // Process LaTeX math expressions
  const processLatex = (inputText: string): string => {
    let processed = inputText;
    
    // Convert LaTeX fractions: \frac{a}{b} -> a/b
    processed = processed.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2');
    
    // Convert inline math delimiters: \(...\) -> remove delimiters
    processed = processed.replace(/\\\((.*?)\\\)/g, '$1');
    
    // Convert display math delimiters: \[...\] -> remove delimiters
    processed = processed.replace(/\\\[(.*?)\\\]/g, '$1');
    
    // Convert $...$ -> remove delimiters
    processed = processed.replace(/\$([^$]+)\$/g, '$1');
    
    // Remove common LaTeX commands
    processed = processed.replace(/\\displaystyle\s*/g, '');
    processed = processed.replace(/\\text\{([^}]+)\}/g, '$1');
    processed = processed.replace(/\\le\b/g, '≤');
    processed = processed.replace(/\\ge\b/g, '≥');
    processed = processed.replace(/\\ne\b/g, '≠');
    processed = processed.replace(/\\div\b/g, '÷');
    processed = processed.replace(/\\times\b/g, '×');
    processed = processed.replace(/\\cdot\b/g, '·');
    processed = processed.replace(/\\pm\b/g, '±');
    processed = processed.replace(/\\;/g, ' ');
    
    return processed;
  };

  const lines = processLatex(text).split('\n');
  
  const renderLine = (line: string, index: number) => {
    // Handle bold text with **text**
    const parts: Array<{ text: string; bold: boolean }> = [];
    let currentText = '';
    let isBold = false;
    let i = 0;
    
    while (i < line.length) {
      if (line[i] === '*' && line[i + 1] === '*') {
        if (currentText) {
          parts.push({ text: currentText, bold: isBold });
          currentText = '';
        }
        isBold = !isBold;
        i += 2;
      } else {
        currentText += line[i];
        i++;
      }
    }
    
    if (currentText) {
      parts.push({ text: currentText, bold: isBold });
    }
    
    // Check if line starts with bullet point
    const isBullet = line.trim().startsWith('*') && !line.trim().startsWith('**');
    const cleanedParts = isBullet ? 
      parts.map((p, idx) => idx === 0 ? { ...p, text: p.text.replace(/^\s*\*\s*/, '') } : p) : 
      parts;
    
    // Skip empty lines
    if (!line.trim() && !inline) {
      return <View key={index} style={{ height: 8 }} />;
    }
    
    return (
      <View key={index} style={[
        styles.lineContainer, 
        { paddingLeft: isBullet ? 12 : 0 }
      ]}>
        {isBullet && (
          <Text style={[styles.bullet, { color: colors.text }]}>•</Text>
        )}
        <Text style={[styles.lineText, { color: colors.text }]}>
          {cleanedParts.map((part, pIndex) => (
            <Text
              key={pIndex}
              style={{
                fontWeight: part.bold ? '700' : '400',
                color: colors.text,
              }}
            >
              {part.text}
            </Text>
          ))}
        </Text>
      </View>
    );
  };
  
  return (
    <View style={inline ? styles.inlineContainer : styles.blockContainer}>
      {lines.map((line, index) => renderLine(line, index))}
    </View>
  );
};

const styles = StyleSheet.create({
  inlineContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  blockContainer: {
    marginBottom: 0,
  },
  lineContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  bullet: {
    marginRight: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  lineText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default MathRenderer;
