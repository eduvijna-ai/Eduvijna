/**
 * Free-form image crop modal for post-camera capture.
 * Uses PanResponder + expo-image-manipulator (no ImagePicker allowsEditing).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import {
  getPendingCropUri,
  resolveCropSession,
  subscribeCropSession,
} from '../services/imageCropSession';

type Rect = { x: number; y: number; width: number; height: number };

const MIN_CROP_PX = 48;
const HANDLE_SIZE = 28;
const INSET_RATIO = 0.02;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (err) => reject(err),
    );
  });
}

function containRect(
  containerW: number,
  containerH: number,
  imageW: number,
  imageH: number,
): Rect {
  if (!containerW || !containerH || !imageW || !imageH) {
    return { x: 0, y: 0, width: containerW, height: containerH };
  }
  const scale = Math.min(containerW / imageW, containerH / imageH);
  const width = imageW * scale;
  const height = imageH * scale;
  return {
    x: (containerW - width) / 2,
    y: (containerH - height) / 2,
    width,
    height,
  };
}

function defaultCropRect(bounds: Rect): Rect {
  const insetX = bounds.width * INSET_RATIO;
  const insetY = bounds.height * INSET_RATIO;
  return {
    x: bounds.x + insetX,
    y: bounds.y + insetY,
    width: Math.max(MIN_CROP_PX, bounds.width - insetX * 2),
    height: Math.max(MIN_CROP_PX, bounds.height - insetY * 2),
  };
}

function clampCropToBounds(crop: Rect, bounds: Rect): Rect {
  const width = clamp(crop.width, MIN_CROP_PX, bounds.width);
  const height = clamp(crop.height, MIN_CROP_PX, bounds.height);
  const x = clamp(crop.x, bounds.x, bounds.x + bounds.width - width);
  const y = clamp(crop.y, bounds.y, bounds.y + bounds.height - height);
  return { x, y, width, height };
}

type DragMode =
  | 'move'
  | 'tl'
  | 'tr'
  | 'bl'
  | 'br'
  | null;

async function applyCrop(
  uri: string,
  natural: { width: number; height: number },
  bounds: Rect,
  crop: Rect,
): Promise<string> {
  const scaleX = natural.width / bounds.width;
  const scaleY = natural.height / bounds.height;

  let originX = Math.round((crop.x - bounds.x) * scaleX);
  let originY = Math.round((crop.y - bounds.y) * scaleY);
  let width = Math.round(crop.width * scaleX);
  let height = Math.round(crop.height * scaleY);

  originX = clamp(originX, 0, natural.width - 1);
  originY = clamp(originY, 0, natural.height - 1);
  width = clamp(width, 1, natural.width - originX);
  height = clamp(height, 1, natural.height - originY);

  const context = ImageManipulator.manipulate(uri);
  context.crop({ originX, originY, width, height });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: 0.92, format: SaveFormat.JPEG });
  context.release();
  image.release();
  return result.uri;
}

export default function ImageCropModal() {
  const insets = useSafeAreaInsets();
  const [imageUri, setImageUri] = useState<string | null>(getPendingCropUri());
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [crop, setCrop] = useState<Rect | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const cropRef = useRef<Rect | null>(null);
  const boundsRef = useRef<Rect | null>(null);
  const dragModeRef = useRef<DragMode>(null);
  const startCropRef = useRef<Rect | null>(null);

  useEffect(() => {
    return subscribeCropSession(() => {
      setImageUri(getPendingCropUri());
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError('');
    setNaturalSize(null);
    setCrop(null);
    cropRef.current = null;

    if (!imageUri) return undefined;

    (async () => {
      try {
        const size = await getImageSize(imageUri);
        if (!cancelled) setNaturalSize(size);
      } catch {
        if (!cancelled) setError('Could not load image for cropping.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [imageUri]);

  const imageBounds = useMemo(() => {
    if (!naturalSize || !containerSize.width || !containerSize.height) return null;
    return containRect(
      containerSize.width,
      containerSize.height,
      naturalSize.width,
      naturalSize.height,
    );
  }, [naturalSize, containerSize]);

  useEffect(() => {
    boundsRef.current = imageBounds;
    if (!imageBounds) return;
    const next = defaultCropRect(imageBounds);
    setCrop(next);
    cropRef.current = next;
  }, [imageBounds]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  const hitTest = (x: number, y: number, rect: Rect): DragMode => {
    const hs = HANDLE_SIZE;
    if (x >= rect.x - hs / 2 && x <= rect.x + hs / 2 && y >= rect.y - hs / 2 && y <= rect.y + hs / 2) {
      return 'tl';
    }
    if (
      x >= rect.x + rect.width - hs / 2 &&
      x <= rect.x + rect.width + hs / 2 &&
      y >= rect.y - hs / 2 &&
      y <= rect.y + hs / 2
    ) {
      return 'tr';
    }
    if (
      x >= rect.x - hs / 2 &&
      x <= rect.x + hs / 2 &&
      y >= rect.y + rect.height - hs / 2 &&
      y <= rect.y + rect.height + hs / 2
    ) {
      return 'bl';
    }
    if (
      x >= rect.x + rect.width - hs / 2 &&
      x <= rect.x + rect.width + hs / 2 &&
      y >= rect.y + rect.height - hs / 2 &&
      y <= rect.y + rect.height + hs / 2
    ) {
      return 'br';
    }
    if (
      x >= rect.x &&
      x <= rect.x + rect.width &&
      y >= rect.y &&
      y <= rect.y + rect.height
    ) {
      return 'move';
    }
    return null;
  };

  const applyDrag = useCallback((dx: number, dy: number) => {
    const bounds = boundsRef.current;
    const start = startCropRef.current;
    const mode = dragModeRef.current;
    if (!bounds || !start || !mode) return;

    let next: Rect = { ...start };

    if (mode === 'move') {
      next.x = start.x + dx;
      next.y = start.y + dy;
      next = clampCropToBounds(next, bounds);
    } else if (mode === 'tl') {
      const right = start.x + start.width;
      const bottom = start.y + start.height;
      next.x = clamp(start.x + dx, bounds.x, right - MIN_CROP_PX);
      next.y = clamp(start.y + dy, bounds.y, bottom - MIN_CROP_PX);
      next.width = right - next.x;
      next.height = bottom - next.y;
    } else if (mode === 'tr') {
      const bottom = start.y + start.height;
      next.y = clamp(start.y + dy, bounds.y, bottom - MIN_CROP_PX);
      next.width = clamp(start.width + dx, MIN_CROP_PX, bounds.x + bounds.width - start.x);
      next.height = bottom - next.y;
    } else if (mode === 'bl') {
      const right = start.x + start.width;
      next.x = clamp(start.x + dx, bounds.x, right - MIN_CROP_PX);
      next.width = right - next.x;
      next.height = clamp(start.height + dy, MIN_CROP_PX, bounds.y + bounds.height - start.y);
    } else if (mode === 'br') {
      next.width = clamp(start.width + dx, MIN_CROP_PX, bounds.x + bounds.width - start.x);
      next.height = clamp(start.height + dy, MIN_CROP_PX, bounds.y + bounds.height - start.y);
    }

    cropRef.current = next;
    setCrop(next);
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          const rect = cropRef.current;
          if (!rect) return;
          const { locationX, locationY } = e.nativeEvent;
          dragModeRef.current = hitTest(locationX, locationY, rect);
          startCropRef.current = { ...rect };
        },
        onPanResponderMove: (_e, gesture: PanResponderGestureState) => {
          applyDrag(gesture.dx, gesture.dy);
        },
        onPanResponderRelease: () => {
          dragModeRef.current = null;
          startCropRef.current = cropRef.current;
        },
        onPanResponderTerminate: () => {
          dragModeRef.current = null;
          startCropRef.current = cropRef.current;
        },
      }),
    [applyDrag],
  );

  const handleCancel = () => {
    if (processing) return;
    resolveCropSession('cancelled');
  };

  const handleRetake = () => {
    if (processing) return;
    resolveCropSession('retake');
  };

  const handleResetCrop = () => {
    if (processing || !imageBounds) return;
    const next = defaultCropRect(imageBounds);
    setCrop(next);
    cropRef.current = next;
  };

  const handleConfirm = async () => {
    if (processing || !imageUri || !naturalSize || !imageBounds || !crop) return;
    setProcessing(true);
    setError('');
    try {
      const croppedUri = await applyCrop(imageUri, naturalSize, imageBounds, crop);
      resolveCropSession({ uri: croppedUri });
    } catch {
      setError('Failed to crop image. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  /** Keep the complete captured frame — no crop applied. */
  const handleUseFullImage = () => {
    if (processing || !imageUri) return;
    resolveCropSession({ uri: imageUri });
  };

  const visible = !!imageUri;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : 'fullScreen'}
      onRequestClose={handleCancel}
    >
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Crop photo</Text>
          <Text style={styles.subtitle}>
            Optional — use full image to keep the complete page, or drag corners to crop
          </Text>
        </View>

        <View style={styles.stage} onLayout={onLayout} {...panResponder.panHandlers}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
          ) : null}

          {imageBounds && crop ? (
            <>
              {/* Dim outside crop */}
              <View pointerEvents="none" style={[styles.dim, { top: 0, left: 0, right: 0, height: crop.y }]} />
              <View
                pointerEvents="none"
                style={[
                  styles.dim,
                  {
                    top: crop.y + crop.height,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  },
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.dim,
                  {
                    top: crop.y,
                    left: 0,
                    width: crop.x,
                    height: crop.height,
                  },
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.dim,
                  {
                    top: crop.y,
                    left: crop.x + crop.width,
                    right: 0,
                    height: crop.height,
                  },
                ]}
              />

              <View
                pointerEvents="none"
                style={[
                  styles.cropBorder,
                  {
                    left: crop.x,
                    top: crop.y,
                    width: crop.width,
                    height: crop.height,
                  },
                ]}
              />

              {([
                ['tl', crop.x, crop.y],
                ['tr', crop.x + crop.width, crop.y],
                ['bl', crop.x, crop.y + crop.height],
                ['br', crop.x + crop.width, crop.y + crop.height],
              ] as const).map(([key, cx, cy]) => (
                <View
                  key={key}
                  pointerEvents="none"
                  style={[
                    styles.handle,
                    {
                      left: cx - HANDLE_SIZE / 2,
                      top: cy - HANDLE_SIZE / 2,
                    },
                  ]}
                />
              ))}
            </>
          ) : (
            <View style={styles.loadingStage}>
              <ActivityIndicator color="#FFFFFF" />
            </View>
          )}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnGhost]}
            onPress={handleCancel}
            disabled={processing}
            accessibilityRole="button"
            accessibilityLabel="Cancel crop"
          >
            <Text style={styles.btnGhostText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnGhost]}
            onPress={handleRetake}
            disabled={processing}
            accessibilityRole="button"
            accessibilityLabel="Retake photo"
          >
            <Text style={styles.btnGhostText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnGhost]}
            onPress={handleResetCrop}
            disabled={processing || !imageBounds}
            accessibilityRole="button"
            accessibilityLabel="Reset crop selection"
          >
            <Text style={styles.btnGhostText}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnGhost]}
            onPress={handleUseFullImage}
            disabled={processing || !imageUri}
            accessibilityRole="button"
            accessibilityLabel="Use full image without cropping"
          >
            <Text style={styles.btnGhostText}>Use full image</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, processing && styles.btnDisabled]}
            onPress={handleConfirm}
            disabled={processing || !crop}
            accessibilityRole="button"
            accessibilityLabel="Use cropped photo"
          >
            {processing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.btnPrimaryText}>Crop & use</Text>
            )}
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 4,
  },
  stage: {
    flex: 1,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  dim: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  cropBorder: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  handle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1B4F5C',
  },
  loadingStage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: '#FCA5A5',
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  btnGhost: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  btnGhostText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  btnPrimary: {
    backgroundColor: '#1B4F5C',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
