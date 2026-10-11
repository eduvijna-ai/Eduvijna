/**
 * Shared rich educational content (Markdown + inline/block math).
 * Use for API-sourced question bodies, explanations, and solutions — not static UI labels.
 */
import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { useTheme } from '@context/ThemeContext';
import MathRenderer from './MathRenderer';

type Props = {
  content: string;
  style?: StyleProp<TextStyle>;
};

export default function EducationalContent({ content }: Props) {
  const { theme } = useTheme();
  if (!content?.trim()) return null;
  return <MathRenderer text={content} colors={theme.colors} />;
}
