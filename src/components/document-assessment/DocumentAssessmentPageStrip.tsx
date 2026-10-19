/**
 * Shared thumbnail strip: tap → fullscreen (or focus), ✓ select, ✗ remove.
 */

import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DocumentWorkspacePage } from '@core/types/documentAssessmentWorkspace';

type Colors = {
  text: string;
  textSecondary: string;
  border: string;
  card: string;
  inputBackground: string;
  primary: string;
};

type Props = {
  pages: DocumentWorkspacePage[];
  focusedPageNumber: number;
  selectedPageNumbers: Set<number>;
  colors: Colors;
  canRemove: boolean;
  onFocusPage: (pageNumber: number) => void;
  onToggleSelect: (pageNumber: number) => void;
  onRemove?: (pageNumber: number) => void;
  onOpenFullscreen: (uri: string) => void;
};

export default function DocumentAssessmentPageStrip({
  pages,
  focusedPageNumber,
  selectedPageNumbers,
  colors,
  canRemove,
  onFocusPage,
  onToggleSelect,
  onRemove,
  onOpenFullscreen,
}: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {pages.map((p) => {
        const isFocused = p.pageNumber === focusedPageNumber;
        const isSelected = selectedPageNumbers.has(p.pageNumber);
        const thumb = p.thumbnailUri || p.uri;
        return (
          <View
            key={p.pageId}
            style={[
              styles.item,
              { borderColor: colors.border, backgroundColor: colors.card },
              isFocused && styles.itemFocused,
              isSelected && styles.itemSelected,
            ]}
          >
            <TouchableOpacity
              style={styles.selectCheck}
              onPress={() => onToggleSelect(p.pageNumber)}
              accessibilityRole="button"
              accessibilityLabel={`${isSelected ? 'Deselect' : 'Select'} page ${p.pageNumber}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Ionicons
                name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={isSelected ? '#0E7490' : '#94A3B8'}
              />
            </TouchableOpacity>
            {canRemove && onRemove ? (
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => onRemove(p.pageNumber)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="button"
                accessibilityLabel={`Remove page ${p.pageNumber}`}
              >
                <Ionicons name="close-circle" size={16} color="#DC2626" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() => {
                onFocusPage(p.pageNumber);
                if (thumb) onOpenFullscreen(thumb);
              }}
              accessibilityRole="imagebutton"
              accessibilityLabel={`Open page ${p.pageNumber} full-screen preview`}
            >
              {thumb ? (
                <Image source={{ uri: thumb }} style={[styles.image, { backgroundColor: colors.inputBackground }]} resizeMode="contain" />
              ) : (
                <View style={[styles.placeholder, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                  <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>{p.pageNumber}</Text>
                </View>
              )}
            </TouchableOpacity>
            <Text
              style={[
                styles.caption,
                { color: colors.textSecondary },
                isFocused && { color: colors.primary, fontWeight: '700' },
                isSelected && { color: '#0E7490', fontWeight: '700' },
              ]}
            >
              {p.pageNumber}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2 },
  item: {
    width: 64,
    borderWidth: 1,
    borderRadius: 8,
    padding: 4,
    alignItems: 'center',
    position: 'relative',
  },
  itemFocused: { borderColor: '#38BDF8', backgroundColor: '#E0F2FE' },
  itemSelected: { borderColor: '#0E7490', backgroundColor: '#ECFEFF' },
  selectCheck: {
    position: 'absolute',
    top: 2,
    left: 2,
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
  },
  removeBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
  },
  image: { width: 54, height: 58, borderRadius: 4 },
  placeholder: {
    width: 54,
    height: 58,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  placeholderText: { fontSize: 14, fontWeight: '700' },
  caption: { marginTop: 3, fontSize: 11 },
});
