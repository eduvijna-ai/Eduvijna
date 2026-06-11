/**
 * App-level react-native shim — applies Poppins to every Text / TextInput.
 * Babel aliases `react-native` → this file for app source only.
 */

import * as React from 'react';
import * as RN from 'react-native-original';
import type { StyleProp, TextInputProps, TextProps, TextStyle } from 'react-native-original';
import { StyleSheet } from 'react-native-original';
import { FONT_FAMILY } from '../theme/fonts';

const WEIGHT_TO_FAMILY: Record<string, string> = {
  '400': FONT_FAMILY.regular,
  normal: FONT_FAMILY.regular,
  '500': FONT_FAMILY.medium,
  '600': FONT_FAMILY.semibold,
  '700': FONT_FAMILY.bold,
  bold: FONT_FAMILY.bold,
  '800': FONT_FAMILY.bold,
};

export function resolveFontFamily(style: StyleProp<TextStyle>): string {
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily && typeof flat.fontFamily === 'string') {
    return flat.fontFamily;
  }
  const weight = flat.fontWeight != null ? String(flat.fontWeight) : '400';
  return WEIGHT_TO_FAMILY[weight] ?? FONT_FAMILY.regular;
}

function wrapTextComponent<P extends { style?: StyleProp<TextStyle> }>(
  Component: React.ComponentType<P>,
) {
  const Wrapped = React.forwardRef<unknown, P>((props, ref) => {
    const family = resolveFontFamily(props.style);
    return React.createElement(Component, {
      ...props,
      ref,
      style: [props.style, { fontFamily: family }],
    } as P);
  });
  Wrapped.displayName = `Poppins(${Component.displayName ?? 'Text'})`;
  return Wrapped;
}

const Text = wrapTextComponent(RN.Text as React.ComponentType<TextProps>);
const TextInput = wrapTextComponent(RN.TextInput as React.ComponentType<TextInputProps>);

export * from 'react-native-original';
export { Text, TextInput };
