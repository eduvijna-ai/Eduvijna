import { Dimensions, Platform, StyleSheet, type ViewStyle } from 'react-native';

const SCREEN = Dimensions.get('screen');

/** Modal props so the backdrop covers the full physical screen on real Android devices. */
export function getFullScreenModalProps(animationType: 'fade' | 'slide' = 'fade') {
  return {
    transparent: true as const,
    animationType,
    statusBarTranslucent: true,
    ...(Platform.OS === 'ios' ? { presentationStyle: 'overFullScreen' as const } : {}),
  };
}

/** Dimmed backdrop that extends under status bar and navigation bar. */
export const fullScreenModalOverlay: ViewStyle = {
  ...StyleSheet.absoluteFillObject,
  width: SCREEN.width,
  height: SCREEN.height,
  flex: 1,
};
