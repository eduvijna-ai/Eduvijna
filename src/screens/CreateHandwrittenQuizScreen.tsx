/**
 * CreateHandwrittenQuizScreen
 *
 * Handwritten Assessment Generator
 * - Pick handwritten paper/notes images (gallery or camera)
 * - Extract text via Batch OCR API  (/api/v1/batch-ocr-upload)
 * - Auto-generate quiz via  /api/v1/quiz/generate-strict
 * - Navigate directly to QuizTakingScreen — no config step
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';
import { apiClient } from '../core/api/config';
import useNotifications from '@core/hooks/useNotifications';

// ============================================================================
// TYPES
// ============================================================================

interface PickedImage {
  uri: string;
  name: string;
  type: string;
}

interface BatchOCRPageResult {
  page_number: number;
  status: string;
  text?: string;
  latex?: string;
}

interface BatchOCRFileResult {
  filename: string;
  file_id: string;
  file_type: string;
  total_pages: number;
  status: string;
  pages: BatchOCRPageResult[];
}

interface BatchOCRResponse {
  success: boolean;
  message: string;
  files: BatchOCRFileResult[];
  total_files: number;
  successful_files: number;
  total_pages_processed: number;
}

interface StrictQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

interface StrictQuizResponse {
  success: boolean;
  quiz: StrictQuizQuestion[];
  message: string;
  count: number;
}

// ============================================================================
// HELPERS
// ============================================================================

// Resize + compress image to avoid 413 errors from large phone camera photos
async function compressImage(uri: string): Promise<string> {
  try {
    const context = ImageManipulator.manipulate(uri);
    context.resize({ width: 1500 });
    const image = await context.renderAsync();
    const result = await image.saveAsync({ compress: 0.6, format: SaveFormat.JPEG });
    context.release();
    image.release();
    return result.uri;
  } catch {
    return uri; // Fall back to original if compression fails
  }
}

function aggregateOcrText(files: BatchOCRFileResult[]): string {
  const parts: string[] = [];
  for (const file of files) {
    if (file.status === 'success' || file.status === 'partial_success') {
      for (const page of file.pages) {
        if (page.status === 'success' && page.text && page.text.trim()) {
          parts.push(page.text.trim());
        }
        if (page.latex && page.latex.trim()) {
          parts.push(page.latex.trim());
        }
      }
    }
  }
  return parts.join('\n\n');
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function CreateHandwrittenQuizScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { colors } = theme;
  const { refreshAfterQuizGenerated } = useNotifications();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => createStyles(), []);

  const [pickedImages, setPickedImages] = useState<PickedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<'ocr' | 'generate' | null>(null);
  const [error, setError] = useState('');

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    await ImagePicker.requestCameraPermissionsAsync();
    await ImagePicker.requestMediaLibraryPermissionsAsync();
  };

  // ============================================================================
  // IMAGE PICKING
  // ============================================================================

  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.85,
        selectionLimit: 5,
      });

      if (!result.canceled && result.assets) {
        const newImages: PickedImage[] = await Promise.all(
          result.assets.map(async (asset, idx) => {
            const compressedUri = await compressImage(asset.uri);
            return {
              uri: compressedUri,
              name: asset.fileName || `hw_${Date.now()}_${idx}.jpg`,
              type: 'image/jpeg',
            };
          }),
        );
        const combined = [...pickedImages, ...newImages];
        if (combined.length > 5) {
          Alert.alert('Limit Reached', 'Maximum 5 images allowed.');
          setPickedImages(combined.slice(0, 5));
        } else {
          setPickedImages(combined);
        }
        setError('');
      }
    } catch {
      Alert.alert('Error', 'Failed to open gallery. Please try again.');
    }
  };

  const handlePickFromCamera = async () => {
    try {
      if (pickedImages.length >= 5) {
        Alert.alert('Limit Reached', 'Maximum 5 images allowed.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const compressedUri = await compressImage(asset.uri);
        setPickedImages(prev => [
          ...prev,
          { uri: compressedUri, name: `hw_${Date.now()}.jpg`, type: 'image/jpeg' },
        ]);
        setError('');
      }
    } catch {
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const handleRemoveImage = (index: number) => {
    setPickedImages(prev => prev.filter((_, i) => i !== index));
  };

  // ============================================================================
  // EXTRACT + GENERATE (combined)
  // ============================================================================

  const handleExtractAndGenerate = async () => {
    if (pickedImages.length === 0) {
      setError('Please select at least one handwritten image first.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // ── Step 1: OCR ──────────────────────────────────────────────────────
      setProcessingStep('ocr');
      const formData = new FormData();
      pickedImages.forEach(img => {
        formData.append('files', { uri: img.uri, type: img.type, name: img.name } as any);
      });

      // React Native XHR automatically appends the boundary to multipart/form-data,
      // so the explicit header is safe and required to override the Axios instance
      // default (application/json). Without it the server receives the wrong
      // Content-Type and returns 422 "Field required".
      const ocrResponse = await apiClient.post<BatchOCRResponse>(
        '/api/v1/batch-ocr-upload',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }
      );

      const ocrData = ocrResponse.data;
      if (!ocrData.success || !ocrData.files?.length) {
        throw new Error(ocrData.message || 'OCR processing failed. No output received.');
      }

      const ocrText = aggregateOcrText(ocrData.files);
      if (!ocrText || ocrText.trim().length < 10) {
        throw new Error(
          'Could not extract readable text. Please ensure the handwriting is clear and try again.'
        );
      }

      // ── Step 2: Generate quiz ─────────────────────────────────────────────
      setProcessingStep('generate');
      const quizResponse = await apiClient.post<StrictQuizResponse>(
        '/api/v1/quiz/generate-strict',
        { content: ocrText },
        { timeout: 90000 }
      );

      const quizData = quizResponse.data;
      if (!quizData.success || !quizData.quiz?.length) {
        throw new Error('Assessment generation returned no questions. Please try again.');
      }

      await refreshAfterQuizGenerated();

      const questions = quizData.quiz.map((item) => ({
        question: item.question,
        options: item.options,
        correctAnswer: item.correctAnswer,
        answer: item.correctAnswer,
      }));

      navigation.replace('QuizTakingScreen', {
        quizData: {
          title: 'Handwritten Assessment',
          questions,
          regenerationParams: {
            type: 'handwritten',
            itext: ocrText,
          },
        },
        source: 'handwritten',
        showShareButton: true,
        showActionButtons: true,
      });
    } catch (err: any) {
      let message: string;
      if (err?.response?.status === 413) {
        message = 'Images are too large to upload. Please try with fewer or smaller images.';
      } else {
        message =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to process your images. Please try again.';
      }
      setError(message);
    } finally {
      setIsProcessing(false);
      setProcessingStep(null);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const processingLabel =
    processingStep === 'ocr' ? 'Extracting text from images…' : 'Generating assessment…';

  const renderImageThumbnail = ({ item, index }: { item: PickedImage; index: number }) => (
    <View style={styles.thumbnailContainer}>
      <Image source={{ uri: item.uri }} style={styles.thumbnail} resizeMode="cover" />
      <TouchableOpacity
        style={styles.removeImageBtn}
        onPress={() => handleRemoveImage(index)}
        disabled={isProcessing}
      >
        <Ionicons name="close-circle" size={22} color="#EF4444" />
      </TouchableOpacity>
      <View style={styles.imageIndexBadge}>
        <Text style={styles.imageIndexText}>{index + 1}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: colors.cardBackground }]}>
          <View style={[styles.heroIconContainer, { backgroundColor: colors.primaryLight + '22' }]}>
            <Ionicons name="create" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Handwritten Assessment
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Capture your handwritten notes or exam papers. Our AI will extract the text and
            generate an MCQ assessment instantly.
          </Text>
        </View>

        {/* How it works */}
        <View style={[styles.instructionCard, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.instructionTitle, { color: colors.text }]}>📋 How it works</Text>
          {[
            'Upload clear photos of your handwritten notes (max 5 images)',
            'AI extracts text using advanced OCR technology',
            'Questions are generated and assessment opens immediately',
          ].map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepBadgeText}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Upload Section */}
        <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📸 Upload Images ({pickedImages.length}/5)
          </Text>

          <View style={styles.uploadButtonRow}>
            <TouchableOpacity
              style={[
                styles.uploadButton,
                { backgroundColor: colors.primary + '18', borderColor: colors.primary },
                (isProcessing || pickedImages.length >= 5) && styles.uploadButtonDisabled,
              ]}
              onPress={handlePickFromGallery}
              disabled={isProcessing || pickedImages.length >= 5}
            >
              <Ionicons name="images" size={20} color={colors.primary} />
              <Text style={[styles.uploadButtonText, { color: colors.primary }]}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.uploadButton,
                { backgroundColor: colors.primary + '18', borderColor: colors.primary },
                (isProcessing || pickedImages.length >= 5) && styles.uploadButtonDisabled,
              ]}
              onPress={handlePickFromCamera}
              disabled={isProcessing || pickedImages.length >= 5}
            >
              <Ionicons name="camera" size={20} color={colors.primary} />
              <Text style={[styles.uploadButtonText, { color: colors.primary }]}>Camera</Text>
            </TouchableOpacity>
          </View>

          {pickedImages.length > 0 ? (
            <FlatList
              data={pickedImages}
              renderItem={renderImageThumbnail}
              keyExtractor={(_, i) => i.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailList}
              scrollEnabled={pickedImages.length > 2}
            />
          ) : (
            <View style={styles.emptyPlaceholder}>
              <Ionicons name="image-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No images selected yet
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
                Supports JPG, PNG · Max 20 MB per image
              </Text>
            </View>
          )}
        </View>

        {/* Error Banner */}
        {!!error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Footer CTA */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(20, insets.bottom),
            backgroundColor: colors.cardBackground,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.ctaButton,
            {
              backgroundColor:
                pickedImages.length === 0 || isProcessing ? colors.border : colors.primary,
            },
          ]}
          onPress={handleExtractAndGenerate}
          disabled={pickedImages.length === 0 || isProcessing}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <View style={styles.buttonInner}>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={styles.ctaButtonText}>{processingLabel}</Text>
            </View>
          ) : (
            <View style={styles.buttonInner}>
              <Ionicons name="flash" size={20} color="#FFF" />
              <Text style={styles.ctaButtonText}>
                {pickedImages.length === 0
                  ? 'Select Images First'
                  : `Generate Assessment from ${pickedImages.length} Image${pickedImages.length > 1 ? 's' : ''}`}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

function createStyles() {
  return StyleSheet.create({
    container: { flex: 1 },

    scrollContent: {
      padding: 16,
      gap: 12,
    },

    // Hero
    heroCard: {
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    heroIconContainer: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    heroTitle: {
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 8,
      textAlign: 'center',
    },
    heroSubtitle: {
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
    },

    // Instructions
    instructionCard: {
      borderRadius: 12,
      padding: 16,
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      gap: 10,
    },
    instructionTitle: {
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 4,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    stepBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    stepBadgeText: {
      color: '#FFF',
      fontSize: 11,
      fontWeight: '700',
    },
    stepText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
    },

    // Upload section
    sectionCard: {
      borderRadius: 12,
      padding: 16,
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 14,
    },
    uploadButtonRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    uploadButton: {
      flex: 1,
      height: 52,
      borderRadius: 10,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    uploadButtonDisabled: {
      opacity: 0.45,
    },
    uploadButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },

    // Thumbnails
    thumbnailList: {
      gap: 10,
      paddingVertical: 4,
    },
    thumbnailContainer: {
      position: 'relative',
      width: 90,
      height: 90,
      borderRadius: 8,
      overflow: 'visible',
    },
    thumbnail: {
      width: 90,
      height: 90,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.1)',
    },
    removeImageBtn: {
      position: 'absolute',
      top: -8,
      right: -8,
      zIndex: 10,
      backgroundColor: '#FFF',
      borderRadius: 11,
    },
    imageIndexBadge: {
      position: 'absolute',
      bottom: 4,
      left: 4,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    imageIndexText: {
      color: '#FFF',
      fontSize: 10,
      fontWeight: '700',
    },

    // Empty placeholder
    emptyPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 28,
      gap: 6,
    },
    emptyText: {
      fontSize: 14,
      fontWeight: '500',
    },
    emptyHint: {
      fontSize: 11,
    },

    // Error
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      borderRadius: 10,
      padding: 12,
      backgroundColor: '#FEF2F2',
    },
    errorBannerText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      color: '#DC2626',
    },

    // Footer
    footer: {
      padding: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    ctaButton: {
      height: 54,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    ctaButtonText: {
      color: '#FFF',
      fontSize: 15,
      fontWeight: '700',
    },
  });
}

