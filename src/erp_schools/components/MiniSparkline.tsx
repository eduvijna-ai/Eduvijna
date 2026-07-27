/** MiniSparkline — compact SVG trend line for subject cards. */

import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

interface MiniSparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function MiniSparkline({
  values,
  width = 56,
  height = 22,
  color = '#10B981',
}: MiniSparklineProps) {
  const pts = values.length ? values : [50, 55, 60];
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = Math.max(1, max - min);
  const stepX = width / Math.max(1, pts.length - 1);
  const points = pts
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
