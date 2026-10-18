/**
 * Full-screen image preview for document / handwritten capture flows.
 * Starts with aspect-fit contain; supports pinch/scroll zoom + pan; Back closes.
 * Does not mutate page selection or trigger deletion.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export type FullScreenImagePreviewProps = {
  visible: boolean;
  uri: string | null;
  title?: string;
  onClose: () => void;
};

export default function FullScreenImagePreview({
  visible,
  uri,
  title,
  onClose,
}: FullScreenImagePreviewProps) {
  const insets = useSafeAreaInsets();
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

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
  }, [uri, visible]);

  const window = Dimensions.get('window');
  const stageW = window.width;
  const stageH = Math.max(200, window.height - insets.top - insets.bottom - 56);

  const fitted = useMemo(() => {
    if (!natural?.width || !natural?.height) {
      return { width: stageW, height: stageH };
    }
    const scale = Math.min(stageW / natural.width, stageH / natural.height);
    return {
      width: Math.max(1, natural.width * scale),
      height: Math.max(1, natural.height * scale),
    };
  }, [natural, stageW, stageH]);

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

        <View style={[styles.stage, { height: stageH }]}>
          {uri && !loadError ? (
            <ScrollView
              ref={scrollRef}
              style={styles.scroll}
              contentContainerStyle={[
                styles.scrollContent,
                { minWidth: stageW, minHeight: stageH },
              ]}
              maximumZoomScale={4}
              minimumZoomScale={1}
              centerContent
              bouncesZoom
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              {natural ? (
                <Image
                  source={{ uri }}
                  style={{ width: fitted.width, height: fitted.height }}
                  resizeMode="contain"
                  accessibilityLabel="Full page image"
                />
              ) : (
                <ActivityIndicator color="#FFFFFF" />
              )}
            </ScrollView>
          ) : (
            <View style={styles.errorBox}>
              <Ionicons name="image-outline" size={40} color="#94A3B8" />
              <Text style={styles.errorText}>
                {loadError ? 'Could not load image.' : 'No image to preview.'}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.hint}>Pinch or scroll to zoom · Close or Back to return</Text>
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
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
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
