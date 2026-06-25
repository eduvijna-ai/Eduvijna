/**
 * CreateHandwrittenQuizScreen
 *
 * Handwritten Assessment Generator (web DocImageExtraction parity)
 * 1. Pick handwritten images (gallery or camera, max 5)
 * 2. OCR via /api/v1/batch-ocr-upload
 * 3. Configure class / subject / lesson / difficulty / question count
 * 4. Generate quiz via /api/v1/quiz/generate-strict → QuizTakingScreen
 */

import React, { useEffect, useMemo, useState } from 'react';
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
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';
import { apiClient } from '../core/api/config';
import { saveUserAssessment } from '../core/services/sharedApi';
import { useUserStore } from '../core/store/user.store';
import useNotifications from '@core/hooks/useNotifications';

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

type FlowPhase = 'capture' | 'configure';
type ProcessingStep = 'ocr' | 'generate';

const COUNT_OPTIONS = [5, 10, 15, 20] as const;
const DIFFICULTY_OPTIONS = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
] as const;

const FLOW_STEPS = [
  'Upload clear photos of handwritten notes (max 5 images)',
  'Extract text with OCR',
  'Set class, subject, and quiz options',
  'Generate assessment and start the quiz',
] as const;

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
    return uri;
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
  const { theme } = useTheme();
  const { colors } = theme;
  const { refreshAfterQuizGenerated } = useNotifications();
  const insets = useSafeAreaInsets();
  const schoolId = useUserStore((s) => s.schoolId);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const workspacePreset = route?.params?.workspacePreset as WorkspacePreset | undefined;

  const [pickedImages, setPickedImages] = useState<PickedImage[]>([]);
  const [flowPhase, setFlowPhase] = useState<FlowPhase>('capture');
  const [extractedOcrText, setExtractedOcrText] = useState('');
  const [classValue, setClassValue] = useState('');
  const [subject, setSubject] = useState('');
  const [lesson, setLesson] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<ProcessingStep | null>(null);
  const [error, setError] = useState('');

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
        setPickedImages((prev) => [
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
    setPickedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRunOcr = async () => {
    if (pickedImages.length === 0) {
      setError('Please select at least one handwritten image first.');
      return;
    }

    setIsProcessing(true);
    setProcessingStep('ocr');
    setError('');

    try {
      const formData = new FormData();
      pickedImages.forEach((img) => {
        formData.append('files', { uri: img.uri, type: img.type, name: img.name } as any);
      });

      const ocrResponse = await apiClient.post<BatchOCRResponse>(
        '/api/v1/batch-ocr-upload',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 },
      );

      const ocrData = ocrResponse.data;
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
      setError(formatError(err));
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
      const quizResponse = await apiClient.post<StrictQuizResponse>(
        '/api/v1/quiz/generate-strict',
        { content },
        { timeout: 90000 },
      );

      const quizData = quizResponse.data;
      if (!quizData.success || !quizData.quiz?.length) {
        throw new Error('Assessment generation returned no questions. Please try again.');
      }

      const questions = quizData.quiz.map((item, idx) => ({
        id: `hw-q-${idx}`,
        question: item.question,
        options: item.options,
        correctAnswer: item.correctAnswer,
        answer: item.correctAnswer,
      }));

      try {
        await saveUserAssessment({
          title: quizTitle,
          subject: resolvedSubject,
          class_name: resolvedClass,
          level: difficulty,
          lesson: resolvedLesson,
          assessment_type: 'web-quiz',
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
      setError(formatError(err));
    } finally {
      setIsProcessing(false);
      setProcessingStep(null);
    }
  };

  const formatError = (err: any): string => {
    if (err?.response?.status === 413) {
      return 'Images are too large to upload. Please try with fewer or smaller images.';
    }
    return (
      err?.response?.data?.detail ||
      err?.response?.data?.message ||
      err?.message ||
      'Failed to process your images. Please try again.'
    );
  };

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
            Step 1 · Upload Images ({pickedImages.length}/5)
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
    footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
    ctaButton: { height: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    ctaButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  });
}
