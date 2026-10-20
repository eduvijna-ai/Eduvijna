/**
 * Full-screen image preview for document / handwritten capture flows.
 * Starts with aspect-fit contain; Android + iOS pinch zoom and two-axis pan
 * via PanResponder (does not rely on iOS-only ScrollView maximumZoomScale).
 * Back/close only — never mutates page selection or deletion.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type PanResponderGestureState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  clampPan,
  clampScale,
  computeContainSize,
  distanceBetween,
  nextPinchScale,
  type Point,
} from '../utils/zoomableImageMath';

export type FullScreenImagePreviewProps = {
  visible: boolean;
  uri: string | null;
  title?: string;
  onClose: () => void;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;

export default function FullScreenImagePreview({
  visible,
  uri,
  title,
  onClose,
}: FullScreenImagePreviewProps) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [stage, setStage] = useState({ width: window.width, height: 400 });
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState<Point>({ x: 0, y: 0 });

  const scaleRef = useRef(1);
  const translateRef = useRef<Point>({ x: 0, y: 0 });
  const pinchStartScale = useRef(1);
  const pinchStartDistance = useRef(0);
  const panStartTranslate = useRef<Point>({ x: 0, y: 0 });
  const modeRef = useRef<'none' | 'pan' | 'pinch'>('none');

  const resetViewport = useCallback(() => {
    scaleRef.current = 1;
    translateRef.current = { x: 0, y: 0 };
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  useEffect(() => {
    setNatural(null);
    setLoadError(false);
    resetViewport();
    if (!uri || !visible) return undefined;
    let cancelled = false;
    Image.getSize(
      uri,
      (width, height) => {
        if (!cancelled) setNatural({ width, height });
      },
      () => {
        if (!cancelled) setLoadError(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [uri, visible, resetViewport]);

  // Rotation / window change → recompute fit baseline and reset zoom/pan.
  useEffect(() => {
    resetViewport();
  }, [window.width, window.height, stage.width, stage.height, resetViewport]);

  const fitted = useMemo(
    () =>
      computeContainSize(natural || { width: stage.width, height: stage.height }, stage),
    [natural, stage],
  );

  const applyScaleTranslate = useCallback(
    (nextScale: number, nextTranslate: Point) => {
      const s = clampScale(nextScale, MIN_SCALE, MAX_SCALE);
      const t =
        s <= 1
          ? { x: 0, y: 0 }
          : clampPan(nextTranslate, fitted, s, stage);
      scaleRef.current = s;
      translateRef.current = t;
      setScale(s);
      setTranslate(t);
    },
    [fitted, stage],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          const touches = e.nativeEvent.touches || [];
          if (touches.length >= 2) {
            modeRef.current = 'pinch';
            pinchStartScale.current = scaleRef.current;
            pinchStartDistance.current = distanceBetween(touches[0], touches[1]);
          } else {
            modeRef.current = scaleRef.current > 1 ? 'pan' : 'none';
            panStartTranslate.current = { ...translateRef.current };
          }
        },
        onPanResponderMove: (e: GestureResponderEvent, gesture: PanResponderGestureState) => {
          const touches = e.nativeEvent.touches || [];
          if (touches.length >= 2) {
            if (modeRef.current !== 'pinch') {
              modeRef.current = 'pinch';
              pinchStartScale.current = scaleRef.current;
              pinchStartDistance.current = distanceBetween(touches[0], touches[1]);
            }
            const dist = distanceBetween(touches[0], touches[1]);
            const next = nextPinchScale(
              pinchStartScale.current,
              pinchStartDistance.current,
              dist,
              MIN_SCALE,
              MAX_SCALE,
            );
            applyScaleTranslate(next, translateRef.current);
            return;
          }
          if (modeRef.current === 'pan' && scaleRef.current > 1) {
            applyScaleTranslate(scaleRef.current, {
              x: panStartTranslate.current.x + gesture.dx,
              y: panStartTranslate.current.y + gesture.dy,
            });
          }
        },
        onPanResponderRelease: () => {
          modeRef.current = 'none';
          applyScaleTranslate(scaleRef.current, translateRef.current);
        },
        onPanResponderTerminate: () => {
          modeRef.current = 'none';
          applyScaleTranslate(scaleRef.current, translateRef.current);
        },
      }),
    [applyScaleTranslate],
  );

  const onStageLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setStage({ width, height });
    }
  };

  const headerReserve = 56;
  const hintReserve = 36;
  const stageHeight = Math.max(
    200,
    window.height - insets.top - insets.bottom - headerReserve - hintReserve,
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {title || 'Image preview'}
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => applyScaleTranslate(scale - 0.5, translate)}
              accessibilityRole="button"
              accessibilityLabel="Zoom out"
            >
              <Ionicons name="remove" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => applyScaleTranslate(scale + 0.5, translate)}
              accessibilityRole="button"
              accessibilityLabel="Zoom in"
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close image preview"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.stage, { height: stageHeight }]} onLayout={onStageLayout} {...panResponder.panHandlers}>
          {uri && !loadError ? (
            natural ? (
              <View
                style={[
                  styles.imageWrap,
                  {
                    width: fitted.width,
                    height: fitted.height,
                    transform: [
                      { translateX: translate.x },
                      { translateY: translate.y },
                      { scale },
                    ],
                  },
                ]}
              >
                <Image
                  source={{ uri }}
                  style={{ width: fitted.width, height: fitted.height }}
                  resizeMode="contain"
                  accessibilityLabel="Full page image"
                />
              </View>
            ) : (
              <ActivityIndicator color="#FFFFFF" />
            )
          ) : (
            <View style={styles.errorBox}>
              <Ionicons name="image-outline" size={40} color="#94A3B8" />
              <Text style={styles.errorText}>
                {loadError ? 'Could not load image.' : 'No image to preview.'}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.hint}>
          Pinch or use +/− to zoom · Drag to pan · Close or Back to return
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  title: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    width: '100%',
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  errorText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  hint: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
});
