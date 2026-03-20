import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Formik, type FormikHelpers, type FormikProps } from 'formik';
import * as Yup from 'yup';
import { useTheme } from '@context/ThemeContext';
import useNotifications from '@core/hooks/useNotifications';
import { generateAIQuiz } from '../core/services/sharedApi';
import QuizFormFields from '../components/QuizFormFields';
import { useDropdowns } from '../context/DropdownContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CreateAIQuizScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { refreshAfterQuizGenerated } = useNotifications();
  const { classes, subjects, difficultyLevels, refreshAll } = useDropdowns();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => createStyles(theme.colors), [theme.colors]);
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
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const validationSchema = Yup.object({
    class: Yup.string().required('Class is required'),
    subject: Yup.string().required('Subject is required'),
    lesson: Yup.string().required('Lesson/Topic is required'),
    level: Yup.string().required('Difficulty level is required'),
    itext: Yup.string().trim().required('Additional instructions are required'),
  });

  return (
    <View style={styles.container}>
      {/* Header with Close Button */}
      {/* <View style={styles.headerBar}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create AI Assessment</Text>
        <View style={styles.headerPlaceholder} />
      </View> */}

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
              // Resolve labels/slugs from IDs to match WebQuizPage.tsx request pattern
              const selectedClass = classes.find((c: any) => c.id === values.class);
              const selectedSubject = subjects.find((s: any) => s.id === values.subject);
              const selectedLevel = difficultyLevels.find((l: any) => l.id === values.level);

              const result = await generateAIQuiz({
                class: selectedClass?.name || values.class,
                subject: selectedSubject?.name || values.subject,
                lesson: values.lesson,
                level: selectedLevel?.slug || values.level,
                count: parseInt(values.count) || 5,
                itext: values.itext,
              });

              // Process quiz response to match WebQuizPage.tsx handling:
              // Shuffle options and normalise correctAnswer to a letter (A/B/C/D)
              const processedQuestions = (result.quiz || []).map((item: any) => {
                const rawOptions: string[] = item.options || [];
                const rawCorrect: string = item.correctAnswer || item.answer || 'A';

                // Resolve correctAnswer to the actual option text
                let correctText: string;
                if (rawCorrect.length === 1 && /^[A-D]$/.test(rawCorrect)) {
                  // It's already a letter – look up the option text
                  correctText = rawOptions[rawCorrect.charCodeAt(0) - 65] || rawCorrect;
                } else {
                  correctText = rawCorrect;
                }

                // Fisher-Yates shuffle of options
                const shuffled = [...rawOptions];
                for (let i = shuffled.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }

                // Determine the new letter for the correct answer after shuffling
                const newIdx = shuffled.findIndex(
                  (opt) => opt.trim() === correctText.trim()
                );
                const newCorrectAnswer = newIdx >= 0
                  ? String.fromCharCode(65 + newIdx)
                  : 'A';

                return {
                  ...item,
                  options: shuffled,
                  correctAnswer: newCorrectAnswer,
                  answer: newCorrectAnswer,
                };
              });

              await refreshAfterQuizGenerated();
              setFormData(values);

              navigation.replace('QuizTakingScreen', {
                quizData: {
                  id: result.quiz_id,
                  title: `${values.lesson} Assessment`,
                  questions: processedQuestions,
                  class: selectedClass?.name,
                  subject: selectedSubject?.name,
                  difficulty: selectedLevel?.name,
                  lesson: values.lesson,
                  additional_instructions: values.itext || '',
                  thread_id: result.thread_id,
                  thread_slug: result.thread_slug,
                  reused_thread: result.reused_thread,
                  regenerationParams: {
                    type: 'ai',
                    classId: values.class,
                    subjectId: values.subject,
                    count: parseInt(values.count) || 5,
                    itext: values.itext,
                  },
                },
                showShareButton: true,
                showActionButtons: true,
              });
            } catch (error: any) {
              console.error('Assessment generation error:', error);
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
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
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
                  lessonPlaceholder="e.g., Simple Present Tense"
                  lessonLabel="Lesson/Topic"
                  lessonError={(touched.lesson || submitCount > 0) ? (errors.lesson as string) : ''}

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
              </View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(20, insets.bottom) }]}>
              {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
              <TouchableOpacity
                style={[styles.generateButton, isSubmitting && styles.buttonDisabled]}
                onPress={() => handleSubmit()}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <LoadingSpinner size={20} />
                ) : (
                  <Text style={styles.generateButtonText}>Generate Assessment</Text>
                )}
              </TouchableOpacity>
            </View>
            {isSubmitting && (
              <View style={styles.loadingOverlay}>
                <View style={styles.loadingContent}>
                  <LoadingSpinner size={60} />
                  <Text style={styles.loadingText}>Generating assessment...</Text>
                  <Text style={styles.loadingSubtext}>Please wait while we prepare your quiz</Text>
                </View>
              </View>
            )}
          </>
        )}
      </Formik>
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
  footer: {
    padding: 16,
    paddingBottom: 20,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  form: {
    padding: 16,
    paddingTop: 12,
  },
  generateButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
  submitError: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  loadingOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(241, 243, 232, 0.7)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    zIndex: 9999,
  },
  loadingContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center' as const,
    minWidth: 250,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
});
