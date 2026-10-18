/**
 * CreateHandwrittenQuizScreen
 *
 * Handwritten Assessment Generator (web DocImageExtraction parity)
 * 1. Pick handwritten images (gallery or camera, max 5)
 * 2. OCR via /api/v1/batch-ocr-upload
 * 3. Configure class / subject / lesson / difficulty / question count
 * 4. Generate quiz via /api/v1/quiz/generate-strict → QuizTakingScreen
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';
import { useQuizNavAccessRedirect } from '@core/hooks/useQuizNavAccessRedirect';
import { apiClient } from '../core/api/config';
import { saveUserAssessment } from '../core/services/sharedApi';
import {
  MAX_IMAGE_UPLOADS,
  runBatchOcrOnImages,
  aggregateOcrText,
} from '../core/services/documentUploadApi';
import { captureDocumentImage } from '../core/services/documentCameraCapture';
import { normalizeAndCompressImage } from '../core/services/documentImageUtils';
import { openImageCropper } from '../core/services/imageCropSession';
import FullScreenImagePreview from '../core/components/FullScreenImagePreview';
import { useUserStore } from '../core/store/user.store';
import useNotifications from '@core/hooks/useNotifications';
import { normalizeDocumentQuizQuestions } from '@core/utils/answerMappingUtils';

interface PickedImage {
  uri: string;
  name: string;
  type: string;
}

interface WorkspacePreset {
  classValue?: string;
  subject?: string;
  lesson?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | '';
  questionCount?: number;
  additionalInstructions?: string;
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

type FlowPhase = 'capture' | 'configure';
type ProcessingStep = 'ocr' | 'generate';

const COUNT_OPTIONS = [5, 10, 15, 20] as const;
const DIFFICULTY_OPTIONS = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
] as const;

const FLOW_STEPS = [
  'Capture or pick handwritten page photos (max 5)',
  'Extract text with OCR',
  'Set class, subject, and quiz options',
  'Generate assessment and start the quiz',
] as const;

/** Web parity (DocImageExtraction): prepend metadata to OCR text for generate-strict. */
export function buildStrictQuizContent(params: {
  classValue?: string;
  subject?: string;
  lesson?: string;
  difficulty?: string;
  questionCount?: number;
  additionalInstructions?: string;
  ocrText: string;
}): string {
  const parts: string[] = [];
  const cls = (params.classValue || '').trim();
  const sub = (params.subject || '').trim();
  const lesson = (params.lesson || '').trim();
  const difficulty = (params.difficulty || '').trim();
  const instructions = (params.additionalInstructions || '').trim();

  if (cls) parts.push(`Class: ${cls}`);
  if (sub) parts.push(`Subject: ${sub}`);
  if (lesson) parts.push(`Lesson: ${lesson}`);
  if (difficulty) parts.push(`Difficulty: ${difficulty}`);
  if (params.questionCount) parts.push(`Number of questions: ${params.questionCount}`);
  if (instructions) parts.push(`Instructions: ${instructions}`);
  parts.push(params.ocrText.trim());
  return parts.join('\n\n');
}

export default function CreateHandwrittenQuizScreen({ navigation, route }: any) {
  useQuizNavAccessRedirect('CreateHandwrittenQuizScreen', navigation);
  const { theme } = useTheme();
  const { colors } = theme;
  const { refreshAfterQuizGenerated } = useNotifications();
  const insets = useSafeAreaInsets();
  const schoolId = useUserStore((s) => s.schoolId);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const workspacePreset = route?.params?.workspacePreset as WorkspacePreset | undefined;

  const [pickedImages, setPickedImages] = useState<PickedImage[]>([]);
  /** Original URIs before optional crop — Cancel/Restore leave capture full-frame. */
  const originalUrisRef = useRef<Record<number, string>>({});
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [flowPhase, setFlowPhase] = useState<FlowPhase>('capture');
  const [extractedOcrText, setExtractedOcrText] = useState('');
  const [classValue, setClassValue] = useState('');
  const [subject, setSubject] = useState('');
  const [lesson, setLesson] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<ProcessingStep | null>(null);
  const [error, setError] = useState('');
  const [errorDiagnostic, setErrorDiagnostic] = useState('');
  const [fullPreviewUri, setFullPreviewUri] = useState<string | null>(null);

  useEffect(() => {
    requestPermissions();
  }, []);

  useEffect(() => {
    if (!workspacePreset) return;
    setClassValue(workspacePreset.classValue ?? '');
    setSubject(workspacePreset.subject ?? '');
    setLesson(workspacePreset.lesson ?? '');
    if (workspacePreset.difficulty === 'easy' || workspacePreset.difficulty === 'hard') {
      setDifficulty(workspacePreset.difficulty);
    } else if (workspacePreset.difficulty === 'medium') {
      setDifficulty('medium');
    }
    if (workspacePreset.questionCount) setQuestionCount(workspacePreset.questionCount);
    setAdditionalInstructions(workspacePreset.additionalInstructions ?? '');
  }, [workspacePreset]);

  useEffect(() => {
    setExtractedOcrText('');
    setFlowPhase('capture');
  }, [pickedImages]);

  const requestPermissions = async () => {
    await ImagePicker.requestCameraPermissionsAsync();
    await ImagePicker.requestMediaLibraryPermissionsAsync();
  };

  const handlePickFromGallery = async () => {
    try {
      const remaining = MAX_IMAGE_UPLOADS - pickedImages.length;
      if (remaining <= 0) {
        Alert.alert('Limit Reached', `Maximum ${MAX_IMAGE_UPLOADS} images allowed.`);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.85,
        selectionLimit: remaining,
      });

      if (!result.canceled && result.assets) {
        const newImages: PickedImage[] = await Promise.all(
          result.assets.map(async (asset, idx) => {
            // Full frame preserved; EXIF baked once; aspect-preserving resize (web parity JPEG).
            const normalized = await normalizeAndCompressImage(asset.uri, {
              maxEdge: 1600,
              compress: 0.75,
              originalName: asset.fileName || `hw_${Date.now()}_${idx}.jpg`,
              sourceMimeType: asset.mimeType,
            });
            return {
              uri: normalized.uri,
              name: normalized.fileName,
              type: normalized.mimeType,
            };
          }),
        );
        const combined = [...pickedImages, ...newImages].slice(0, MAX_IMAGE_UPLOADS);
        if (pickedImages.length + newImages.length > MAX_IMAGE_UPLOADS) {
          Alert.alert('Limit Reached', `Maximum ${MAX_IMAGE_UPLOADS} images allowed.`);
        }
        setPickedImages(combined);
        combined.forEach((img, i) => {
          if (!originalUrisRef.current[i]) originalUrisRef.current[i] = img.uri;
        });
        setSelectedImageIndex(Math.max(0, combined.length - 1));
        setError('');
      }
    } catch {
      Alert.alert('Error', 'Failed to open gallery. Please try again.');
    }
  };

  const handlePickFromCamera = async () => {
    try {
      if (pickedImages.length >= MAX_IMAGE_UPLOADS) {
        Alert.alert('Limit Reached', `Maximum ${MAX_IMAGE_UPLOADS} images allowed.`);
        return;
      }
      const captured = await captureDocumentImage();
      if (!captured) return;
      // Full frame already EXIF-normalized + compressed — do not compress again.
      setPickedImages((prev) => {
        const next = [
          ...prev,
          { uri: captured.uri, name: captured.name, type: captured.mimeType || 'image/jpeg' },
        ];
        originalUrisRef.current[next.length - 1] = captured.uri;
        setSelectedImageIndex(next.length - 1);
        return next;
      });
      setError('');
      setErrorDiagnostic('');
    } catch {
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const handleRemoveImage = (index: number) => {
    setPickedImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      const remapped: Record<number, string> = {};
      next.forEach((img, i) => {
        const oldIdx = i < index ? i : i + 1;
        remapped[i] = originalUrisRef.current[oldIdx] || img.uri;
      });
      originalUrisRef.current = remapped;
      setSelectedImageIndex((sel) => Math.min(sel, Math.max(0, next.length - 1)));
      return next;
    });
  };

  const handleCropSelectedImage = async () => {
    const idx = selectedImageIndex;
    const img = pickedImages[idx];
    if (!img?.uri) {
      Alert.alert('Crop', 'Select an image first.');
      return;
    }
    if (!originalUrisRef.current[idx]) {
      originalUrisRef.current[idx] = img.uri;
    }
    try {
      const result = await openImageCropper(img.uri);
      if (result === 'cancelled' || result === 'retake' || !result?.uri) return;
      setPickedImages((prev) =>
        prev.map((p, i) =>
          i === idx
            ? {
                ...p,
                uri: result.uri,
                name: p.name.replace(/\.\w+$/, '') + '_crop.jpg',
                type: 'image/jpeg',
              }
            : p,
        ),
      );
      setError('');
    } catch {
      Alert.alert('Crop', 'Failed to crop image. Please try again.');
    }
  };

  const handleRestoreOriginalImage = () => {
    const idx = selectedImageIndex;
    const original = originalUrisRef.current[idx];
    if (!original) return;
    setPickedImages((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, uri: original } : p)),
    );
  };

  const handleRunOcr = async () => {
    if (pickedImages.length === 0) {
      setError('Please select at least one handwritten image first.');
      return;
    }

    setIsProcessing(true);
    setProcessingStep('ocr');
    setError('');
    setErrorDiagnostic('');

    try {
      // Same contract as web HandwrittenWorkspace: POST /batch-ocr-upload field `files`.
      const ocrData = await runBatchOcrOnImages(
        pickedImages.map((img) => ({
          uri: img.uri,
          name: img.name,
          type: img.type || 'image/jpeg',
        })),
      );
      if (!ocrData.success || !ocrData.files?.length) {
        throw new Error(ocrData.message || 'OCR processing failed. No output received.');
      }

      const ocrText = aggregateOcrText(ocrData.files);
      if (!ocrText || ocrText.trim().length < 10) {
        throw new Error(
          'Could not extract readable text. Please ensure the handwriting is clear and try again.',
        );
      }

      setExtractedOcrText(ocrText);
      setFlowPhase('configure');
    } catch (err: any) {
      const { userMessage, diagnostic } = formatError(err);
      setError(userMessage);
      setErrorDiagnostic(diagnostic);
      if (diagnostic) {
        console.warn('[handwritten]', diagnostic);
      }
    } finally {
      setIsProcessing(false);
      setProcessingStep(null);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!extractedOcrText.trim()) {
      setError('Please extract text from your images before generating.');
      return;
    }

    setIsProcessing(true);
    setProcessingStep('generate');
    setError('');
    setErrorDiagnostic('');

    const resolvedClass = classValue.trim() || 'General';
    const resolvedSubject = subject.trim() || 'Handwritten';
    const resolvedLesson = lesson.trim() || 'Handwritten Notes';
    const quizTitle = resolvedLesson || 'Handwritten Assessment';
    const content = buildStrictQuizContent({
      classValue: resolvedClass,
      subject: resolvedSubject,
      lesson: resolvedLesson,
      difficulty,
      questionCount,
      additionalInstructions,
      ocrText: extractedOcrText,
    });

    try {
      // Web HandwrittenWorkspace: generate-strict with content + language.
      const quizResponse = await apiClient.post<StrictQuizResponse>(
        '/api/v1/quiz/generate-strict',
        { content, language: 'English' },
        { timeout: 90000 },
      );

      const quizData = quizResponse.data;
      if (!quizData.success || !quizData.quiz?.length) {
        throw new Error('Assessment generation returned no questions. Please try again.');
      }

      const questions = normalizeDocumentQuizQuestions(
        quizData.quiz.map((item, idx) => ({
          id: `hw-q-${idx}`,
          question: item.question,
          options: item.options,
          correctAnswer: item.correctAnswer,
          answer: item.correctAnswer,
        })),
        true,
      );

      if (questions.length === 0) {
        throw new Error('Assessment generation returned no valid questions. Please try again.');
      }

      try {
        await saveUserAssessment({
          title: quizTitle,
          subject: resolvedSubject,
          class_name: resolvedClass,
          level: difficulty,
          lesson: resolvedLesson,
          assessment_type: 'web-quiz',
          // Web HandwrittenWorkspace OCR/instant path — source Handwritten
          // so History under handwritten module matches mobile.
          source: 'Handwritten',
          school_id: schoolId ?? null,
          questions: questions.map((q) => ({
            quiz: {
              question: q.question,
              options: q.options,
              answer: q.correctAnswer,
            },
            answer: q.correctAnswer,
          })),
        });
      } catch {
        // non-blocking
      }

      await refreshAfterQuizGenerated();

      navigation.replace('QuizTakingScreen', {
        quizData: {
          title: quizTitle,
          class: resolvedClass,
          subject: resolvedSubject,
          difficulty,
          lesson: resolvedLesson,
          questions,
          regenerationParams: {
            type: 'handwritten',
            itext: content,
          },
        },
        source: 'handwritten',
        showShareButton: true,
        showActionButtons: true,
      });
    } catch (err: any) {
      const { userMessage, diagnostic } = formatError(err);
      setError(userMessage);
      setErrorDiagnostic(diagnostic);
      if (diagnostic) {
        console.warn('[handwritten]', diagnostic);
      }
    } finally {
      setIsProcessing(false);
      setProcessingStep(null);
    }
  };

  const formatError = (err: any): { userMessage: string; diagnostic: string } => {
    const status = err?.response?.status;
    const detail =
      err?.response?.data?.detail ||
      err?.response?.data?.message ||
      err?.message ||
      'Failed to process your images. Please try again.';
    const detailStr = typeof detail === 'string' ? detail : JSON.stringify(detail);
    if (status === 413) {
      return {
        userMessage: 'Images are too large to upload. Please try with fewer or smaller images.',
        diagnostic: `HTTP 413 · batch-ocr-upload / generate-strict`,
      };
    }
    if (status === 503 && /Mathpix|OCR/i.test(detailStr)) {
      return {
        userMessage:
          'Text extraction is temporarily unavailable. Your images and form values were kept — try again shortly, or contact your school administrator if this continues.',
        diagnostic: `HTTP 503 · ${detailStr.slice(0, 180)}`,
      };
    }
    // Prefer a short actionable message; keep API paths/providers out of user-facing copy.
    const sanitizedUser =
      typeof detailStr === 'string' && !/\/api\/v1|Mathpix|ENABLE_/i.test(detailStr)
        ? detailStr
        : status
          ? `Something went wrong while processing your pages (error ${status}). Your images and form values were kept — please try again.`
          : 'Something went wrong while processing your pages. Your images and form values were kept — please try again.';
    return {
      userMessage: sanitizedUser,
      diagnostic: status
        ? `HTTP ${status} · ${String(err?.config?.url || err?.response?.config?.url || 'handwritten').slice(0, 120)} · ${detailStr.slice(0, 160)}`
        : `client · ${detailStr.slice(0, 160)}`,
    };
  };

  const processingLabel =
    processingStep === 'ocr' ? 'Extracting text from images…' : 'Generating assessment…';

  const renderImageThumbnail = ({ item, index }: { item: PickedImage; index: number }) => (
    <View
      style={[
        styles.thumbnailContainer,
        selectedImageIndex === index && { borderColor: colors.primary, borderWidth: 2 },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setSelectedImageIndex(index)}
        onLongPress={() => setFullPreviewUri(item.uri)}
        accessibilityRole="imagebutton"
        accessibilityLabel={`Select handwritten page ${index + 1}. Long press to preview.`}
        accessibilityState={{ selected: selectedImageIndex === index }}
        disabled={isProcessing}
      >
        <Image source={{ uri: item.uri }} style={styles.thumbnail} resizeMode="contain" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.removeImageBtn}
        onPress={() => handleRemoveImage(index)}
        disabled={isProcessing}
        accessibilityRole="button"
        accessibilityLabel={`Remove page ${index + 1}`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close-circle" size={22} color="#EF4444" />
      </TouchableOpacity>
      <View style={styles.imageIndexBadge}>
        <Text style={styles.imageIndexText}>{index + 1}</Text>
      </View>
    </View>
  );

  const footerLabel =
    flowPhase === 'capture'
      ? pickedImages.length === 0
        ? 'Select Images First'
        : `Extract Text from ${pickedImages.length} Image${pickedImages.length > 1 ? 's' : ''}`
      : 'Generate Assessment';

  const footerDisabled =
    isProcessing ||
    (flowPhase === 'capture' ? pickedImages.length === 0 : !extractedOcrText.trim());

  const footerAction = flowPhase === 'capture' ? handleRunOcr : handleGenerateQuiz;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.heroCard, { backgroundColor: colors.cardBackground }]}>
          <View style={[styles.heroIconContainer, { backgroundColor: colors.primaryLight + '22' }]}>
            <Ionicons name="create" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Handwritten Assessment</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Capture notes or exam papers, extract text with OCR, then configure and generate MCQs.
          </Text>
        </View>

        <View style={[styles.instructionCard, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.instructionTitle, { color: colors.text }]}>How it works</Text>
          {FLOW_STEPS.map((step, i) => (
            <View key={step} style={styles.stepRow}>
              <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepBadgeText}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Step 1 · Upload Images ({pickedImages.length}/{MAX_IMAGE_UPLOADS})
          </Text>

          <View style={styles.uploadButtonRow}>
            <TouchableOpacity
              style={[
                styles.uploadButton,
                { backgroundColor: colors.primary + '18', borderColor: colors.primary },
                (isProcessing || pickedImages.length >= MAX_IMAGE_UPLOADS) && styles.uploadButtonDisabled,
              ]}
              onPress={handlePickFromGallery}
              disabled={isProcessing || pickedImages.length >= MAX_IMAGE_UPLOADS}
            >
              <Ionicons name="images" size={20} color={colors.primary} />
              <Text style={[styles.uploadButtonText, { color: colors.primary }]}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.uploadButton,
                { backgroundColor: colors.primary + '18', borderColor: colors.primary },
                (isProcessing || pickedImages.length >= MAX_IMAGE_UPLOADS) && styles.uploadButtonDisabled,
              ]}
              onPress={handlePickFromCamera}
              disabled={isProcessing || pickedImages.length >= MAX_IMAGE_UPLOADS}
            >
              <Ionicons name="camera" size={20} color={colors.primary} />
              <Text style={[styles.uploadButtonText, { color: colors.primary }]}>Camera</Text>
            </TouchableOpacity>
          </View>

          {pickedImages.length > 0 ? (
            <View style={styles.uploadButtonRow}>
              <TouchableOpacity
                testID="handwritten-crop-selected"
                accessibilityRole="button"
                accessibilityLabel="Crop selected page"
                style={[
                  styles.uploadButton,
                  { backgroundColor: colors.primary + '18', borderColor: colors.primary },
                  isProcessing && styles.uploadButtonDisabled,
                ]}
                onPress={handleCropSelectedImage}
                disabled={isProcessing}
              >
                <Ionicons name="crop-outline" size={20} color={colors.primary} />
                <Text style={[styles.uploadButtonText, { color: colors.primary }]}>Crop</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="handwritten-restore-original"
                accessibilityRole="button"
                accessibilityLabel="Restore original full-frame image"
                style={[
                  styles.uploadButton,
                  { backgroundColor: colors.primary + '18', borderColor: colors.primary },
                  (isProcessing || !originalUrisRef.current[selectedImageIndex]) &&
                    styles.uploadButtonDisabled,
                ]}
                onPress={handleRestoreOriginalImage}
                disabled={isProcessing || !originalUrisRef.current[selectedImageIndex]}
              >
                <Ionicons name="refresh-outline" size={20} color={colors.primary} />
                <Text style={[styles.uploadButtonText, { color: colors.primary }]}>Restore</Text>
              </TouchableOpacity>
            </View>
          ) : null}

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
            </View>
          )}
        </View>

        {flowPhase === 'configure' && (
          <>
            <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Step 2 · OCR Complete</Text>
              <View style={styles.ocrSuccessRow}>
                <Ionicons name="checkmark-circle" size={18} color="#059669" />
                <Text style={[styles.ocrSuccessText, { color: colors.text }]}>
                  Text extracted ({extractedOcrText.length} characters)
                </Text>
              </View>
              <Text style={[styles.ocrPreview, { color: colors.textSecondary }]} numberOfLines={4}>
                {extractedOcrText}
              </Text>
              <TouchableOpacity
                style={styles.reExtractBtn}
                onPress={() => {
                  setFlowPhase('capture');
                  setExtractedOcrText('');
                }}
                disabled={isProcessing}
              >
                <Ionicons name="refresh-outline" size={14} color={colors.primary} />
                <Text style={[styles.reExtractText, { color: colors.primary }]}>Re-run OCR</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Step 3 · Quiz Options</Text>
              <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                These settings are included in the quiz generation request.
              </Text>

              <Text style={[styles.label, { color: colors.text }]}>Class / Grade</Text>
              <TextInput
                value={classValue}
                onChangeText={setClassValue}
                placeholder="e.g., Class 10"
                style={[styles.metaInput, { color: colors.text, borderColor: colors.border }]}
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.label, { color: colors.text }]}>Subject</Text>
              <TextInput
                value={subject}
                onChangeText={setSubject}
                placeholder="e.g., Physics"
                style={[styles.metaInput, { color: colors.text, borderColor: colors.border }]}
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.label, { color: colors.text }]}>Lesson / Topic</Text>
              <TextInput
                value={lesson}
                onChangeText={setLesson}
                placeholder="e.g., Newton's Laws"
                style={[styles.metaInput, { color: colors.text, borderColor: colors.border }]}
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.label, { color: colors.text }]}>Difficulty</Text>
              <View style={styles.pillRow}>
                {DIFFICULTY_OPTIONS.map((option) => {
                  const active = difficulty === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.pillBtn,
                        { borderColor: colors.border },
                        active && { borderColor: colors.primary, backgroundColor: colors.primary + '14' },
                      ]}
                      onPress={() => setDifficulty(option.key)}
                    >
                      <Text style={[styles.pillText, { color: colors.textSecondary }, active && { color: colors.primary, fontWeight: '700' }]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: colors.text }]}>Number of Questions</Text>
              <View style={styles.pillRow}>
                {COUNT_OPTIONS.map((count) => {
                  const active = questionCount === count;
                  return (
                    <TouchableOpacity
                      key={count}
                      style={[
                        styles.pillBtn,
                        { borderColor: colors.border },
                        active && { borderColor: colors.primary, backgroundColor: colors.primary + '14' },
                      ]}
                      onPress={() => setQuestionCount(count)}
                    >
                      <Text style={[styles.pillText, { color: colors.textSecondary }, active && { color: colors.primary, fontWeight: '700' }]}>
                        {count}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: colors.text }]}>Additional Instructions</Text>
              <TextInput
                value={additionalInstructions}
                onChangeText={setAdditionalInstructions}
                placeholder="Optional instructions for question generation"
                style={[styles.metaInput, styles.metaInputMultiline, { color: colors.text, borderColor: colors.border }]}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>
          </>
        )}

        {!!error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(20, insets.bottom + 8),
            backgroundColor: colors.cardBackground,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.ctaButton,
            { backgroundColor: footerDisabled ? colors.border : colors.primary },
          ]}
          onPress={footerAction}
          disabled={footerDisabled}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <View style={styles.buttonInner}>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={styles.ctaButtonText}>{processingLabel}</Text>
            </View>
          ) : (
            <View style={styles.buttonInner}>
              <Ionicons name={flowPhase === 'capture' ? 'scan-outline' : 'flash'} size={20} color="#FFF" />
              <Text style={styles.ctaButtonText}>{footerLabel}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <FullScreenImagePreview
        visible={!!fullPreviewUri}
        uri={fullPreviewUri}
        title="Handwritten page"
        onClose={() => setFullPreviewUri(null)}
      />
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 16, gap: 12, paddingBottom: 24 },
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
    heroTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
    heroSubtitle: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
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
    instructionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
    stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    stepBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    stepBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
    stepText: { flex: 1, fontSize: 12, lineHeight: 18 },
    sectionCard: {
      borderRadius: 12,
      padding: 16,
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
    },
    sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
    sectionSub: { fontSize: 12, marginBottom: 8, marginTop: -4 },
    uploadButtonRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
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
    uploadButtonDisabled: { opacity: 0.45 },
    uploadButtonText: { fontSize: 14, fontWeight: '600' },
    thumbnailList: { gap: 10, paddingVertical: 4 },
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
    imageIndexText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
    emptyPlaceholder: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28, gap: 6 },
    emptyText: { fontSize: 14, fontWeight: '500' },
    ocrSuccessRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    ocrSuccessText: { fontSize: 13, fontWeight: '600' },
    ocrPreview: { fontSize: 12, lineHeight: 18, marginBottom: 10 },
    reExtractBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
    reExtractText: { fontSize: 12, fontWeight: '600' },
    label: { fontSize: 13, fontWeight: '600', marginTop: 8, marginBottom: 6 },
    metaInput: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 14,
      backgroundColor: colors.inputBackground || colors.cardBackground,
    },
    metaInputMultiline: { minHeight: 72, textAlignVertical: 'top' },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pillBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    pillText: { fontSize: 13, fontWeight: '500' },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      borderRadius: 10,
      padding: 12,
      backgroundColor: '#FEF2F2',
    },
    errorBannerText: { flex: 1, fontSize: 13, lineHeight: 18, color: '#DC2626' },
    errorDiagnosticText: { fontSize: 11, lineHeight: 15, color: '#9F1239', opacity: 0.85 },
    footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
    ctaButton: { height: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    ctaButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  });
}
