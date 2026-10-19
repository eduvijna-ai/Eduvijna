/**
 * Free-form image crop modal for post-camera capture.
 * Uses PanResponder + expo-image-manipulator (no ImagePicker allowsEditing).
 *
 * Proven contract:
 * 1) Bake EXIF into pixels before measuring / cropping.
 * 2) Gesture + crop overlay share the stage coordinate system (pageX − stage origin).
 * 3) mapCropRectToSourcePixels uses getSize of that same baked buffer.
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
  cropFileNameFromBase,
  getPendingCropSuggestedFileName,
  getPendingCropUri,
  resolveCropSession,
  subscribeCropSession,
} from '../services/imageCropSession';
import { bakeExifOrientation } from '../services/documentImageUtils';
import {
  containFitRect,
  mapCropRectToSourcePixels,
  pagePointToStageLocal,
  type CropRect,
} from '../utils/imageCropGeometry';

const MIN_CROP_PX = 48;
const HANDLE_SIZE = 28;
const INSET_RATIO = 0.02;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function defaultCropRect(bounds: CropRect): CropRect {
  const insetX = bounds.width * INSET_RATIO;
  const insetY = bounds.height * INSET_RATIO;
  return {
    x: bounds.x + insetX,
    y: bounds.y + insetY,
    width: Math.max(MIN_CROP_PX, bounds.width - insetX * 2),
    height: Math.max(MIN_CROP_PX, bounds.height - insetY * 2),
  };
}

function clampCropToBounds(crop: CropRect, bounds: CropRect): CropRect {
  const width = clamp(crop.width, MIN_CROP_PX, bounds.width);
  const height = clamp(crop.height, MIN_CROP_PX, bounds.height);
  const x = clamp(crop.x, bounds.x, bounds.x + bounds.width - width);
  const y = clamp(crop.y, bounds.y, bounds.y + bounds.height - height);
  return { x, y, width, height };
}

type DragMode = 'move' | 'tl' | 'tr' | 'bl' | 'br' | null;

async function applyCrop(
  uri: string,
  natural: { width: number; height: number },
  bounds: CropRect,
  crop: CropRect,
): Promise<{ uri: string; width: number; height: number }> {
  const { originX, originY, width, height } = mapCropRectToSourcePixels(natural, bounds, crop);

  const context = ImageManipulator.manipulate(uri);
  context.crop({ originX, originY, width, height });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: 0.92, format: SaveFormat.JPEG });
  context.release();
  image.release();
  return {
    uri: result.uri,
    width: result.width || width,
    height: result.height || height,
  };
}

export default function ImageCropModal() {
  const insets = useSafeAreaInsets();
  const [pendingUri, setPendingUri] = useState<string | null>(getPendingCropUri());
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [processing, setProcessing] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState('');

  const cropRef = useRef<CropRect | null>(null);
  const boundsRef = useRef<CropRect | null>(null);
  const dragModeRef = useRef<DragMode>(null);
  const startCropRef = useRef<CropRect | null>(null);
  const stageRef = useRef<View | null>(null);
  const stageWindowOriginRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    return subscribeCropSession(() => {
      setPendingUri(getPendingCropUri());
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError('');
    setNaturalSize(null);
    setCrop(null);
    cropRef.current = null;
    setImageUri(null);

    if (!pendingUri) return undefined;

    (async () => {
      setPreparing(true);
      try {
        const baked = await bakeExifOrientation(pendingUri, {
          originalName: getPendingCropSuggestedFileName(),
        });
        if (cancelled) return;
        const uri = baked.uri;
        const width = baked.width;
        const height = baked.height;
        if (width && height) {
          setNaturalSize({ width, height });
        } else {
          await new Promise<void>((resolve, reject) => {
            Image.getSize(
              uri,
              (w, h) => {
                if (!cancelled) setNaturalSize({ width: w, height: h });
                resolve();
              },
              reject,
            );
          });
        }
        if (!cancelled) setImageUri(uri);
      } catch {
        if (!cancelled) setError('Could not load image for cropping.');
      } finally {
        if (!cancelled) setPreparing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingUri]);

  const imageBounds = useMemo(() => {
    if (!naturalSize || !containerSize.width || !containerSize.height) return null;
    return containFitRect(containerSize, naturalSize);
  }, [naturalSize, containerSize]);

  useEffect(() => {
    boundsRef.current = imageBounds;
    if (!imageBounds) return;
    const next = defaultCropRect(imageBounds);
    setCrop(next);
    cropRef.current = next;
  }, [imageBounds]);

  const refreshStageWindowOrigin = useCallback(() => {
    stageRef.current?.measureInWindow((x, y) => {
      stageWindowOriginRef.current = { x, y };
    });
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ width, height });
    // Layout can shift with safe-area / keyboard; re-measure window origin.
    requestAnimationFrame(refreshStageWindowOrigin);
  };

  const hitTest = (x: number, y: number, rect: CropRect): DragMode => {
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
    if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
      return 'move';
    }
    return null;
  };

  const applyDrag = useCallback((dx: number, dy: number) => {
    const bounds = boundsRef.current;
    const start = startCropRef.current;
    const mode = dragModeRef.current;
    if (!bounds || !start || !mode) return;

    let next: CropRect = { ...start };

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
          refreshStageWindowOrigin();
          const { pageX, pageY } = e.nativeEvent;
          const local = pagePointToStageLocal(
            { x: pageX, y: pageY },
            stageWindowOriginRef.current,
          );
          dragModeRef.current = hitTest(local.x, local.y, rect);
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
    [applyDrag, refreshStageWindowOrigin],
  );

  const handleCancel = () => {
    if (processing || preparing) return;
    resolveCropSession({ kind: 'cancelled' });
  };

  const handleRetake = () => {
    if (processing || preparing) return;
    resolveCropSession({ kind: 'retake' });
  };

  const handleResetCrop = () => {
    if (processing || preparing || !imageBounds) return;
    const next = defaultCropRect(imageBounds);
    setCrop(next);
    cropRef.current = next;
  };

  const handleConfirm = async () => {
    if (processing || preparing || !imageUri || !naturalSize || !imageBounds || !crop) return;
    setProcessing(true);
    setError('');
    try {
      const cropped = await applyCrop(imageUri, naturalSize, imageBounds, crop);
      resolveCropSession({
        kind: 'cropped',
        uri: cropped.uri,
        mimeType: 'image/jpeg',
        fileName: cropFileNameFromBase(getPendingCropSuggestedFileName(), 'page'),
        width: cropped.width,
        height: cropped.height,
      });
    } catch {
      setError('Failed to crop image. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Keep the current input bytes without cropping.
   * Does not restore a pre-crop original — callers own that via Restore.
   */
  const handleUseCurrentImage = () => {
    if (processing || preparing || !pendingUri) return;
    // Prefer baked URI when available so downstream dimensions match pixels.
    const uri = imageUri || pendingUri;
    resolveCropSession({
      kind: 'unchanged',
      uri,
      width: naturalSize?.width,
      height: naturalSize?.height,
    });
  };

  const visible = !!pendingUri;

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
            Optional — keep the current image unchanged, or drag corners to crop. Restore original is
            on the previous screen.
          </Text>
        </View>

        <View
          ref={stageRef}
          style={styles.stage}
          onLayout={onLayout}
          {...panResponder.panHandlers}
          collapsable={false}
        >
          {imageUri ? (
            <View style={styles.image} pointerEvents="none">
              <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
            </View>
          ) : null}

          {imageBounds && crop && !preparing ? (
            <>
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

              {(
                [
                  ['tl', crop.x, crop.y],
                  ['tr', crop.x + crop.width, crop.y],
                  ['bl', crop.x, crop.y + crop.height],
                  ['br', crop.x + crop.width, crop.y + crop.height],
                ] as const
              ).map(([key, cx, cy]) => (
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
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost]}
              onPress={handleCancel}
              disabled={processing || preparing}
              accessibilityRole="button"
              accessibilityLabel="Cancel crop"
            >
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnGhost]}
              onPress={handleRetake}
              disabled={processing || preparing}
              accessibilityRole="button"
              accessibilityLabel="Retake photo"
            >
              <Text style={styles.btnGhostText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnGhost]}
              onPress={handleResetCrop}
              disabled={processing || preparing || !imageBounds}
              accessibilityRole="button"
              accessibilityLabel="Reset crop selection"
            >
              <Text style={styles.btnGhostText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost]}
              onPress={handleUseCurrentImage}
              disabled={processing || preparing || !pendingUri}
              accessibilityRole="button"
              accessibilityLabel="Keep current image without cropping"
            >
              <Text style={styles.btnGhostText}>Keep current</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btn,
                styles.btnPrimary,
                styles.btnPrimaryWide,
                (processing || preparing) && styles.btnDisabled,
              ]}
              onPress={handleConfirm}
              disabled={processing || preparing || !crop}
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
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  btn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  btnGhost: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  btnGhostText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  btnPrimary: {
    backgroundColor: '#1B4F5C',
  },
  btnPrimaryWide: {
    flex: 1.35,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
