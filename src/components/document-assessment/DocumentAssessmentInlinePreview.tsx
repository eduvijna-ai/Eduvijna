/**
 * Shared focused-page preview with Fit zoom reset on page / URI version change.
 * Tap opens fullscreen; pinch/pan live in FullScreenImagePreview.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { computeContainFitBitmapSize } from '@core/utils/documentImageGeometry';

type Colors = {
  text: string;
  textSecondary: string;
  border: string;
  card: string;
  background: string;
  inputBackground: string;
  primary: string;
};

type Props = {
  pageNumber: number;
  totalPages: number;
  uri?: string | null;
  loading?: boolean;
  colors: Colors;
  onOpenFullscreen: (uri: string) => void;
  onPageChange: (page: number) => void;
  /** Bumps when Crop/Restore changes bytes for the same pageNumber. */
  imageVersionKey?: string;
};

export default function DocumentAssessmentInlinePreview({
  pageNumber,
  totalPages,
  uri,
  loading,
  colors,
  onOpenFullscreen,
  onPageChange,
  imageVersionKey = '',
}: Props) {
  const [zoom, setZoom] = useState(100);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [viewport, setViewport] = useState({
    width: Math.max(200, Dimensions.get('window').width - 32),
    height: 220,
  });
  const hScrollRef = useRef<ScrollView>(null);
  const vScrollRef = useRef<ScrollView>(null);

  const fitKey = `${pageNumber}|${uri || ''}|${imageVersionKey}`;

  useEffect(() => {
    setZoom(100);
    hScrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
    vScrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
  }, [fitKey]);

  useEffect(() => {
    let cancelled = false;
    setNatural(null);
    if (!uri) return undefined;
    Image.getSize(
      uri,
      (width, height) => {
        if (!cancelled) setNatural({ width, height });
      },
      () => {
        if (!cancelled) setNatural(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const viewportW = viewport.width;
  const viewportH = viewport.height;

  const fitSize = useMemo(() => {
    if (natural?.width && natural?.height) {
      return computeContainFitBitmapSize(natural, { width: viewportW, height: viewportH });
    }
    return { width: viewportW, height: viewportH };
  }, [natural, viewportW, viewportH]);

  const displayW = fitSize.width * (zoom / 100);
  const displayH = fitSize.height * (zoom / 100);

  return (
    <View style={styles.block}>
      <View style={styles.toolbar}>
        <View style={[styles.pageNav, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[styles.navBtn, { backgroundColor: colors.background }, pageNumber <= 1 && styles.disabled]}
            onPress={() => onPageChange(Math.max(1, pageNumber - 1))}
            disabled={pageNumber <= 1}
            accessibilityRole="button"
            accessibilityLabel="Previous page"
          >
            <Ionicons name="chevron-back" size={16} color={pageNumber <= 1 ? colors.textSecondary : colors.text} />
          </TouchableOpacity>
          <Text style={[styles.pageNavText, { color: colors.text }]}>
            Page {pageNumber} of {totalPages}
          </Text>
          <TouchableOpacity
            style={[
              styles.navBtn,
              { backgroundColor: colors.background },
              pageNumber >= totalPages && styles.disabled,
            ]}
            onPress={() => onPageChange(Math.min(totalPages, pageNumber + 1))}
            disabled={pageNumber >= totalPages}
            accessibilityRole="button"
            accessibilityLabel="Next page"
          >
            <Ionicons
              name="chevron-forward"
              size={16}
              color={pageNumber >= totalPages ? colors.textSecondary : colors.text}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.zoomRow}>
          <TouchableOpacity
            style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => setZoom((z) => Math.max(60, z - 20))}
            accessibilityRole="button"
            accessibilityLabel="Zoom out"
          >
            <Ionicons name="remove" size={16} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setZoom(100)}
            accessibilityRole="button"
            accessibilityLabel="Reset zoom to fit"
          >
            <Text style={[styles.zoomText, { color: colors.text }]}>{zoom === 100 ? 'Fit' : `${zoom}%`}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => setZoom((z) => Math.min(200, z + 20))}
            accessibilityRole="button"
            accessibilityLabel="Zoom in"
          >
            <Ionicons name="add" size={16} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={vScrollRef}
        style={[styles.previewWrap, { borderColor: colors.border, backgroundColor: colors.inputBackground, height: 220 }]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 0 && height > 0) {
            setViewport({ width, height });
          }
        }}
        contentContainerStyle={[
          styles.previewContent,
          {
            width: Math.max(viewportW, displayW),
            minHeight: Math.max(viewportH, displayH),
          },
        ]}
        horizontal={false}
        nestedScrollEnabled
        showsVerticalScrollIndicator={zoom > 100}
      >
        <ScrollView
          ref={hScrollRef}
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={zoom > 100}
          contentContainerStyle={styles.previewInner}
        >
          {uri ? (
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={() => onOpenFullscreen(uri)}
              accessibilityRole="imagebutton"
              accessibilityLabel="Open full-screen page preview"
            >
              <Image
                source={{ uri }}
                style={{ width: displayW, height: displayH }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ) : (
            <View style={[styles.placeholder, { width: viewportW, height: viewportH - 4 }]}>
              {loading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="document-text-outline" size={36} color={colors.textSecondary} />
              )}
              <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                {loading ? 'Loading page preview…' : `Page ${pageNumber} preview unavailable`}
              </Text>
            </View>
          )}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 8 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  pageNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    flexShrink: 1,
  },
  pageNavText: { fontWeight: '700', fontSize: 12, minWidth: 84, textAlign: 'center' },
  navBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  zoomText: { fontWeight: '700', fontSize: 12, minWidth: 36, textAlign: 'center' },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewWrap: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
  },
  previewContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
  },
  placeholderText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  disabled: { opacity: 0.45 },
});
