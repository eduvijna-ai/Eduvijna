/**
 * Gradient — a linear-gradient background built with react-native-svg.
 *
 * The app does not include `expo-linear-gradient`; rather than add a dependency,
 * we render an absolutely-positioned SVG behind the children. Used by HeroCard,
 * ClassContextBanner and gradient CTAs.
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';

interface GradientProps {
  colors: readonly string[];
  /** Gradient angle: 'horizontal' | 'vertical' | 'diagonal' */
  direction?: 'horizontal' | 'vertical' | 'diagonal';
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  children?: React.ReactNode;
}

const DIRECTION_COORDS = {
  horizontal: { x1: '0', y1: '0', x2: '1', y2: '0' },
  vertical: { x1: '0', y1: '0', x2: '0', y2: '1' },
  diagonal: { x1: '0', y1: '0', x2: '1', y2: '1' },
} as const;

export function Gradient({
  colors,
  direction = 'diagonal',
  style,
  borderRadius = 0,
  children,
}: GradientProps) {
  const coords = DIRECTION_COORDS[direction];
  const gradientId = React.useId();

  return (
    <View style={[{ overflow: 'hidden', borderRadius, position: 'relative' }, style]}>
      <Svg
        style={StyleSheet.absoluteFillObject}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
      >
        <Defs>
          <SvgLinearGradient id={gradientId} x1={coords.x1} y1={coords.y1} x2={coords.x2} y2={coords.y2}>
            {colors.map((color, index) => (
              <Stop
                key={`${color}-${index}`}
                offset={`${(index / Math.max(colors.length - 1, 1)) * 100}%`}
                stopColor={color}
                stopOpacity={1}
              />
            ))}
          </SvgLinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
      {children}
    </View>
  );
}
