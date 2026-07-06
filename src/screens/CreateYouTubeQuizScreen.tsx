import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Formik, type FormikHelpers, type FormikProps } from 'formik';
import * as Yup from 'yup';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { sanitizeQuizQuestions } from '@core/utils/quizQuestionUtils';
import { generateAIQuiz, saveUserAssessment } from '../core/services/sharedApi';
import { useUserStore } from '../core/store/user.store';
import QuizFormFields from '../components/QuizFormFields';
import { useDropdowns } from '../context/DropdownContext';
import { apiClient } from '../core/api/config';
import MathRenderer from '../components/MathRenderer';
import useNotifications from '@core/hooks/useNotifications';

export default function CreateYouTubeQuizScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { refreshAfterQuizGenerated } = useNotifications();
  const insets = useSafeAreaInsets();
  const { classes, subjects } = useDropdowns();
  const schoolId = useUserStore((s) => s.schoolId);
  const styles = React.useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoAnalysis, setVideoAnalysis] = useState<any | null>(null);
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<'input' | 'analysis' | 'assessment'>('input');
  const [assessmentStep, setAssessmentStep] = useState<'analysis' | 'assessment'>('analysis');
  const [quizQuestionCount, setQuizQuestionCount] = useState(5);
  const [lesson, setLesson] = useState('');
  const [level, setLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [classValue, setClassValue] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  type FormValues = {
    class: string;
    subject: string;
    lesson: string;
    level: string;
    count: string;
    itext: string;
  };

  const [formData, setFormData] = useState<FormValues>({
    class: '',
    subject: '',
    lesson: '',
    level: '',
    count: '5',
    itext: '',
  });

  const validationSchema = Yup.object({
    class: Yup.string().required('Class is required'),
    subject: Yup.string().required('Subject is required'),
    lesson: Yup.string().required('Lesson/Topic is required'),
    level: Yup.string().required('Difficulty level is required'),
    // Additional instructions are optional — matches the web YouTube workspace.
    itext: Yup.string().trim(),
  });

  const isYoutubeUrlValid = React.useMemo(
    () => validateYouTubeUrl(youtubeUrl.trim()),
    [youtubeUrl]
  );
  const showInvalidUrlHint = youtubeUrl.trim().length > 0 && !isYoutubeUrlValid;

  const summarySections = React.useMemo(() => {
    const rawSummary = String(videoAnalysis?.summary || '');
    if (!rawSummary.trim()) {
      return {
        mainSummary: '',
        criticalTakeaways: [] as string[],
        selfAssessmentQuestions: [] as string[],
      };
    }

    const stripTags = (value: string) =>
      value
        .replace(/<details[^>]*>/gi, '')
        .replace(/<summary[^>]*>/gi, '')
        .replace(/<\/summary>/gi, '')
        .replace(/<\/details>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/[<>]/g, '')
        .replace(/\*\*/g, '')
        .replace(/`{1,3}/g, '')
        .replace(/^#{1,6}\s*/gm, '')
        .replace(/^\s*---\s*$/gm, '')
        .replace(/\u00A0/g, ' ')
        .trim();

    const normalized = stripTags(rawSummary);
    const criticalHeadingRegex = /##\s*4[^\n]*Critical\s*Takeaways[^\n]*/i;
    const selfHeadingRegex = /##\s*5[^\n]*Self[-‑\s]*Assessment\s*Questions[^\n]*/i;

    const criticalMatch = normalized.match(criticalHeadingRegex);
    const selfMatch = normalized.match(selfHeadingRegex);

    const mainSummaryEnd = criticalMatch?.index ?? normalized.length;
    const mainSummary = normalized
      .slice(0, mainSummaryEnd)
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const criticalStart = criticalMatch ? (criticalMatch.index! + criticalMatch[0].length) : -1;
    const selfStart = selfMatch ? selfMatch.index! : -1;

    const criticalBlock = criticalStart >= 0
      ? normalized.slice(criticalStart, selfStart >= 0 ? selfStart : normalized.length)
      : '';

    const selfBlock = selfMatch
      ? normalized.slice(selfMatch.index! + selfMatch[0].length)
      : '';

    const criticalTakeaways: string[] = [];
    const criticalLines = criticalBlock
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    criticalLines.forEach((line) => {
      if (/^\|[-\s:|]+\|?$/.test(line)) return;

      if (line.startsWith('|') && line.endsWith('|')) {
        const parts = line
          .split('|')
          .map((part) => part.trim())
          .filter(Boolean);
        if (parts.length >= 2 && !/must-?know fact|why it'?s exam-?ready/i.test(parts.join(' '))) {
          criticalTakeaways.push(`${parts[0]} — ${parts[1]}`);
        }
        return;
      }

      if (/^[-•]/.test(line)) {
        criticalTakeaways.push(line.replace(/^[-•]\s*/, '').trim());
      }
    });

    const questionMatches = Array.from(selfBlock.matchAll(/(?:^|\n)\s*(\d+)\.\s+([^\n]+)/g));
    const selfAssessmentQuestions = questionMatches
      .map((match) => `${match[1]}. ${match[2].replace(/\s+/g, ' ').trim()}`)
      .filter((question) => question.length > 3);

    return {
      mainSummary,
      criticalTakeaways,
      selfAssessmentQuestions,
    };
  }, [videoAnalysis?.summary]);

  const summaryDisplay = React.useMemo(() => {
    const full = String(summarySections.mainSummary || videoAnalysis?.summary || '').trim();
    if (!full) {
      return { full: '', collapsed: '', shouldTruncate: false };
    }

    const lines = full.split('\n');
    const shouldTruncate = lines.length > 16 || full.length > 1400;
    const collapsed = shouldTruncate
      ? `${lines.slice(0, 16).join('\n').trimEnd()}\n\n...`
      : full;

    return { full, collapsed, shouldTruncate };
  }, [summarySections.mainSummary, videoAnalysis?.summary]);

  useEffect(() => {
    navigation.setOptions({ title: 'YouTube Assessment' });
  }, [navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      const actionType = e?.data?.action?.type;
      const isBackAction = actionType === 'GO_BACK' || actionType === 'POP' || actionType === 'POP_TO_TOP';
      if (!isBackAction) {
        return;
      }

      e.preventDefault();

      if (currentStep === 'assessment') {
        setCurrentStep('analysis');
        setAssessmentStep('analysis');
        return;
      }

      if (currentStep === 'analysis') {
        setCurrentStep('input');
        setAssessmentStep('analysis');
        return;
      }

      navigation.navigate('Main');
    });

    return unsubscribe;
  }, [navigation, currentStep]);

  const normalizeArray = (value: any): any[] => {
    if (Array.isArray(value)) {
      return value;
    }
    if (!value) {
      return [];
    }
    if (typeof value === 'string') {
      return value
        .split(/[|,]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (typeof value === 'object') {
      return Object.values(value).flat().filter(Boolean);
    }
    return [value];
  };

  function validateYouTubeUrl(url: string): boolean {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    return youtubeRegex.test(url);
  }

  const analyzeVideo = async () => {
    if (!youtubeUrl.trim()) {
      Alert.alert('Error', 'Please enter a YouTube URL');
      return;
    }

    if (!validateYouTubeUrl(youtubeUrl)) {
      Alert.alert('Error', 'Please enter a valid YouTube URL');
      return;
    }

    setIsLoadingVideo(true);
    try {
      console.log('Analyzing YouTube video:', youtubeUrl);

      // Step 1: Get video transcript
      const transcriptResponse = await apiClient.get(`/api/v1/yttranscript?url=${encodeURIComponent(youtubeUrl.trim())}`);
      
      //console.log('Transcript response:', transcriptResponse.data);
      
      if (!transcriptResponse.data || !transcriptResponse.data.transcript) {
        Alert.alert('Error', 'Could not fetch video transcript. Video may not have captions.');
        return;
      }

      setVideoTitle(transcriptResponse.data.title || 'YouTube Video');

      // Step 2: Get video summary
      const studentLevelForSummary = level === 'basic'
        ? 'elementary'
        : level === 'intermediate'
          ? 'middle_school'
          : level === 'advanced'
            ? 'pre_medical'
            : 'middle_school';

      const summaryResponse = await apiClient.post('/api/v1/ytblinksummary', {
        transcript: transcriptResponse.data.transcript,
        additional_instructions: '',
        student_level: studentLevelForSummary,
        title: transcriptResponse.data.title || 'YouTube Video',
      });

      if (summaryResponse.data) {
        const tags = summaryResponse.data.tags || {};
        const analysisData = {
          summary:
            summaryResponse.data.summary ||
            summaryResponse.data.message ||
            'Video analyzed successfully.',
          keywords: normalizeArray(
            tags.Keywords ||
            tags.keywords ||
            summaryResponse.data.keywords
          ),
          elements: normalizeArray(
            summaryResponse.data.elements
          ),
          subject: tags.Subject || tags.subject || summaryResponse.data.subject || subject,
          topic: tags.Topic || tags.topic || summaryResponse.data.topic || lesson,
          raw_response: summaryResponse.data,
        };

        setVideoAnalysis(analysisData);
        setIsSummaryExpanded(false);
        setAssessmentStep('analysis');
        setCurrentStep('analysis');
        console.log('Video analysis complete, moving to analysis step');
      } else {
        Alert.alert('Error', 'Could not generate video summary');
      }
    } catch (error: any) {
      console.error('Failed to analyze video:', error);
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to analyze video. Please try again.'
      );
    } finally {
      setIsLoadingVideo(false);
    }
  };

  const generateQuiz = async (values: FormValues) => {
    setIsGenerating(true);

    try {
      let finalPrompt = '';

      if (videoAnalysis?.summary) {
        finalPrompt += videoAnalysis.summary;
      }

      if (values.itext.trim()) {
        if (finalPrompt) {
          finalPrompt += '\n\n';
        }
        finalPrompt += `Additional instructions: ${values.itext.trim()}`;
      }

      if (!finalPrompt) {
        finalPrompt = 'Generate assessment questions based on the video content.';
      }

      const result = await generateAIQuiz({
        class: values.class,
        subject: values.subject,
        lesson: values.lesson,
        level: values.level,
        count: parseInt(values.count, 10) || 5,
        itext: finalPrompt,
      });

      const sanitizedQuiz = sanitizeQuizQuestions(result.quiz || []);
      if (!sanitizedQuiz.length) {
        setSubmitError('The assessment was created but no valid questions were generated from the video.');
        return;
      }

      await refreshAfterQuizGenerated();

      setClassValue(values.class);
      setSubject(values.subject);
      setLesson(values.lesson);
      setLevel(values.level);
      setQuizQuestionCount(parseInt(values.count, 10) || 5);
      setAdditionalInstructions(values.itext);

      const classLabel = classes.find((c) => c.id === values.class)?.name || values.class;
      const subjectLabel = subjects.find((s) => s.id === values.subject)?.name || values.subject;

      // Persist to history — mirrors the web YouTube workspace (youtube-quiz / YouTube).
      try {
        await saveUserAssessment({
          title: [subjectLabel, values.lesson].filter(Boolean).join(' - ') || `YouTube: ${videoTitle || 'Video'}`,
          subject: subjectLabel,
          class_name: classLabel,
          level: values.level,
          lesson: values.lesson,
          questions: (result.quiz || []).map((q: any) => ({
            quiz: {
              question: q.question,
              options: q.options,
              answer: q.answer || q.correctAnswer || 'A',
              explanation: q.explanation || '',
            },
            answer: q.answer || q.correctAnswer || 'A',
          })),
          assessment_type: 'youtube-quiz',
          source: 'YouTube',
          school_id: schoolId ?? null,
        });
      } catch {
        // Save failure is non-critical
      }

      navigation.navigate('QuizTakingScreen', {
        quizData: {
          id: result.quiz_id,
          title: `${values.lesson} Assessment`,
          questions: sanitizedQuiz,
          class: classLabel,
          subject: subjectLabel,
          difficulty: values.level,
          lesson: values.lesson,
          additional_instructions: finalPrompt || '',
          thread_id: result.thread_id,
          thread_slug: result.thread_slug,
          reused_thread: result.reused_thread,
          regenerationParams: {
            type: 'youtube',
            url: youtubeUrl,
            studentLevel: values.level === 'basic' ? 'elementary' : values.level === 'intermediate' ? 'middle_school' : 'pre_medical',
            classId: values.class,
            subjectId: values.subject,
            count: parseInt(values.count, 10) || 5,
            itext: finalPrompt,
          },
        },
        source: 'youtube',
        showShareButton: true,
        showActionButtons: true,
      });
    } catch (error: unknown) {
      console.error('Assessment generation error:', error);
      const errorMsg = (error as any)?.response?.data?.detail || (error as any)?.message || 'Failed to generate assessment from video';
      setSubmitError(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBackToInput = () => {
    setCurrentStep('input');
    setAssessmentStep('analysis');
  };

  const handleBackToAnalysis = () => {
    setCurrentStep('analysis');
    setAssessmentStep('analysis');
  };

  const handleCloseToYouTubeAssessment = () => {
    setCurrentStep('input');
    setAssessmentStep('analysis');
  };

  const handleGoToAssessment = () => {
    setSubmitError('');
    setFormData({
      class: classValue,
      subject: subject,
      lesson: lesson,
      level: level,
      count: String(quizQuestionCount),
      itext: additionalInstructions,
    });
    setAssessmentStep('assessment');
    setCurrentStep('assessment');
  };

  const renderElementLabel = (element: any, index: number): string => {
    if (typeof element === 'string') {
      return element;
    }
    return element?.label || element?.name || element?.topic || `Element ${index + 1}`;
  };

  const renderElementDescription = (element: any): string => {
    if (typeof element === 'string') {
      return '';
    }
    return element?.description || element?.value || element?.detail || element?.explanation || '';
  };

  return (
    <View style={styles.container}>
      {currentStep === 'assessment' ? (
        <Formik
          initialValues={formData}
          validationSchema={validationSchema}
          onSubmit={async (
            values: FormValues,
            { setSubmitting }: FormikHelpers<FormValues>
          ) => {
            setSubmitError('');
            setSubmitting(true);
            try {
              await generateQuiz(values);
            } catch (error: any) {
              const errorMsg = error.response?.data?.detail || error.message || 'Failed to generate assessment';
              setSubmitError(errorMsg);
            } finally {
              setSubmitting(false);
            }
          }}
          validateOnBlur={true}
          validateOnChange={false}
        >
          {({
            values,
            errors,
            touched,
            submitCount,
            isSubmitting,
            handleSubmit,
            setFieldValue,
            setFieldTouched,
          }: FormikProps<FormValues>) => (
            <>
              <View style={[styles.headerBar, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleBackToAnalysis}
                >
                  <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Generate Assessment</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleCloseToYouTubeAssessment}
                >
                  <Ionicons name="close" size={22} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(120, insets.bottom + 20) }]}
              >
                <View style={styles.form}>
                  <QuizFormFields
                    showClass={true}
                    classValue={values.class}
                    onClassChange={(value) => {
                      setFieldValue('class', value);
                      setFieldTouched('class', true, false);
                    }}
                    classError={(touched.class || submitCount > 0) ? (errors.class as string) : ''}

                    showSubject={true}
                    subjectValue={values.subject}
                    onSubjectChange={(value) => {
                      setFieldValue('subject', value);
                      setFieldTouched('subject', true, false);
                    }}
                    subjectError={(touched.subject || submitCount > 0) ? (errors.subject as string) : ''}

                    showLesson={true}
                    lessonValue={values.lesson}
                    onLessonChange={(text) => setFieldValue('lesson', text)}
                    onLessonBlur={() => setFieldTouched('lesson', true)}
                    lessonError={(touched.lesson || submitCount > 0) ? (errors.lesson as string) : ''}
                    lessonPlaceholder="e.g., JavaScript Basics, React Hooks"
                    lessonLabel="Lesson/Topic"

                    showDifficultyLevel={true}
                    difficultyValue={values.level}
                    onDifficultyChange={(value) => {
                      setFieldValue('level', value);
                      setFieldTouched('level', true, false);
                    }}
                    difficultyError={submitCount > 0 ? (errors.level as string) : ''}

                    showQuestionCount={true}
                    questionCountValue={values.count}
                    onQuestionCountChange={(text) => setFieldValue('count', text)}

                    additionalInstructionsValue={values.itext}
                    onAdditionalInstructionsChange={(text) => setFieldValue('itext', text)}
                    onAdditionalInstructionsBlur={() => setFieldTouched('itext', true)}
                    additionalInstructionsError={(touched.itext || submitCount > 0) ? (errors.itext as string) : ''}
                  />

                  {submitError ? (
                    <Text style={styles.submitErrorText}>{submitError}</Text>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.generateButton, (isSubmitting || isGenerating) && styles.buttonDisabled]}
                    onPress={handleSubmit as any}
                    disabled={isSubmitting || isGenerating}
                  >
                    {isSubmitting || isGenerating ? (
                      <LoadingSpinner size={20} />
                    ) : (
                      <Text style={styles.generateButtonText}>Generate Assessment</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </>
          )}
        </Formik>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {currentStep === 'input' && (
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>YouTube URL *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChangeText={setYoutubeUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  editable={true}
                />
                <Text style={styles.hint}>Paste the link to the YouTube video</Text>
                {showInvalidUrlHint && (
                  <Text style={styles.validationHint}>Enter a valid YouTube URL to enable Analyze Video</Text>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.generateButton,
                  (isLoadingVideo || !isYoutubeUrlValid) && styles.buttonDisabled,
                ]}
                onPress={analyzeVideo}
                disabled={isLoadingVideo || !isYoutubeUrlValid}
              >
                {isLoadingVideo ? (
                  <LoadingSpinner size={20} />
                ) : (
                  <View style={styles.generateButtonContent}>
                    <Ionicons name="logo-youtube" size={20} color={theme.colors.buttonText} />
                    <Text style={styles.generateButtonText}>Analyze Video</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>How it works:</Text>
                <Text style={styles.infoText}>• Validates video has transcripts/subtitles</Text>
                <Text style={styles.infoText}>• AI analyzes the video content</Text>
                <Text style={styles.infoText}>• Extracts key concepts and topics</Text>
                <Text style={styles.infoText}>• Creates targeted questions based on the content</Text>
              </View>
            </View>
          )}

          {currentStep === 'analysis' && videoAnalysis && assessmentStep === 'analysis' && (
            <View style={styles.form}>
              <View style={styles.analysisHeader}>
                <View>
                  <Text style={styles.analysisTitle}>YouTube Analysis</Text>
                </View>
                <TouchableOpacity onPress={handleBackToInput} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {videoTitle ? (
                <View style={styles.analysisSection}>
                  <Text style={styles.analysisSectionTitle}>Video Title</Text>
                  <Text style={styles.sectionText}>{videoTitle}</Text>
                </View>
              ) : null}

              <View style={styles.analysisSection}>
                <Text style={styles.analysisSectionTitle}>Summary</Text>
                <MathRenderer
                  text={
                    isSummaryExpanded || !summaryDisplay.shouldTruncate
                      ? summaryDisplay.full
                      : summaryDisplay.collapsed
                  }
                  colors={theme.colors}
                />
                {summaryDisplay.shouldTruncate && (
                  <TouchableOpacity
                    style={styles.summaryToggleButton}
                    onPress={() => setIsSummaryExpanded((prev) => !prev)}
                  >
                    <Text style={styles.summaryToggleText}>
                      {isSummaryExpanded ? 'View less' : 'View more'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {summarySections.criticalTakeaways.length > 0 && (
                <View style={styles.analysisSection}>
                  <Text style={styles.analysisSectionTitle}>Critical Takeaways</Text>
                  {summarySections.criticalTakeaways.map((takeaway, idx) => (
                    <View key={`takeaway-${idx}`} style={styles.takeawayCard}>
                      <Text style={styles.takeawayText}>• {takeaway}</Text>
                    </View>
                  ))}
                </View>
              )}

              {summarySections.selfAssessmentQuestions.length > 0 && (
                <View style={styles.analysisSection}>
                  <Text style={styles.analysisSectionTitle}>Self-Assessment Questions</Text>
                  {summarySections.selfAssessmentQuestions.map((question, idx) => (
                    <View key={`question-${idx}`} style={styles.questionCard}>
                      <Text style={styles.questionText}>{question}</Text>
                    </View>
                  ))}
                </View>
              )}

              {videoAnalysis.elements && Array.isArray(videoAnalysis.elements) && videoAnalysis.elements.length > 0 && (
                <View style={styles.analysisSection}>
                  <Text style={styles.analysisSectionTitle}>Detected Elements</Text>
                  {videoAnalysis.elements.map((element: any, idx: number) => {
                    const elementLabel = renderElementLabel(element, idx);
                    const elementDescription = renderElementDescription(element);
                    return (
                      <View key={idx} style={styles.elementCard}>
                        <Text style={styles.elementLabel}>{elementLabel}</Text>
                        {elementDescription ? (
                          <Text style={styles.elementDescription}>{elementDescription}</Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}

              <TouchableOpacity
                onPress={handleGoToAssessment}
                style={styles.generateButton}
              >
                <Text style={styles.generateButtonText}>Generate Assessment</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {(isLoadingVideo || isGenerating) && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <LoadingSpinner size={60} />
            <Text style={styles.loadingOverlayText}>
              {isLoadingVideo ? 'Analyzing video...' : 'Generating assessment...'}
            </Text>
            <Text style={styles.loadingOverlaySubtext}>Please wait</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  form: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: colors.placeholder,
    marginTop: 4,
  },
  validationHint: {
    fontSize: 12,
    color: colors.error,
    marginTop: 6,
  },
  statusContainer: {
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.textSecondary,
  },
  validationMessage: {
    fontSize: 14,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  validMessage: {
    backgroundColor: colors.chipBackground,
    color: colors.success,
  },
  invalidMessage: {
    backgroundColor: colors.chipBackground,
    color: colors.error,
  },
  generateButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  generateButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
  generateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  infoBox: {
    backgroundColor: colors.chipBackground,
    padding: 16,
    borderRadius: 8,
    marginTop: 10,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  analysisTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  analysisSection: {
    marginBottom: 16,
  },
  analysisSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  summaryToggleButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: colors.inputBackground,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  summaryToggleText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  sectionText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  elementCard: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  elementLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  elementDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  takeawayCard: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  takeawayText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  questionCard: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  questionText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitErrorText: {
    color: colors.error,
    fontSize: 14,
    marginBottom: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  loadingContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 28,
    alignItems: 'center',
    minWidth: 220,
  },
  loadingOverlayText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  loadingOverlaySubtext: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textSecondary,
  },
});

