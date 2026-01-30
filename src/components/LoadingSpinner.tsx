/**
 * Custom Loading Spinner with Eduvijna Logo
 * Reusable loading indicator with animated logo
 */

import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Platform } from 'react-native';
import { useTheme } from '@context/ThemeContext';

interface LoadingSpinnerProps {
  size?: number;
  fullScreen?: boolean;
}

export default function LoadingSpinner({ size = 60, fullScreen = false }: LoadingSpinnerProps) {
  const { theme } = useTheme();
  const spinValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Rotation animation
    const rotationAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    rotationAnimation.start();
    pulseAnimation.start();

    return () => {
      rotationAnimation.stop();
      pulseAnimation.stop();
    };
  }, [spinValue, scaleValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const containerStyle = fullScreen
    ? [styles.fullScreenContainer, { backgroundColor: theme.colors.background }]
    : styles.container;

  return (
    <View style={containerStyle}>
      <Animated.View
        style={{
          transform: [{ rotate: spin }, { scale: scaleValue }],
        }}
      >
        <Image
          source={require('../../assets/eduvijna_logoOnly.png')}
          style={[styles.logo, { width: size, height: size }]}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    ...Platform.select({
      web: {
        // Web-specific style applied via container
      } as any,
    }),
  },
});
