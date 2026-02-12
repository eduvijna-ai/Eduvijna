import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
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
              const result = await generateAIQuiz({
                class: values.class,
                subject: values.subject,
                lesson: values.lesson,
                level: values.level,
                count: parseInt(values.count) || 5,
                itext: values.itext,
              });

              await refreshAfterQuizGenerated();
              setFormData(values);

              navigation.replace('QuizTakingScreen', {
                quizData: {
                  id: result.quiz_id,
                  title: `${values.lesson} Assessment`,
                  questions: result.quiz || [],
                  class: classes.find((c: any) => c.id === values.class)?.name,
                  subject: subjects.find((s: any) => s.id === values.subject)?.name,
                  difficulty: difficultyLevels.find((l: any) => l.id === values.level)?.name,
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
          handleBlur,
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
                  onLessonBlur={() => handleBlur('lesson')({} as any)}
                  lessonPlaceholder="e.g., Simple Present Tense"
                  lessonLabel="Lesson/Topic"
                  lessonError={(touched.lesson || submitCount > 0) ? (errors.lesson as string) : ''}

                  showDifficultyLevel={true}
                  difficultyValue={values.level}
                  onDifficultyChange={(value) => {
                    setFieldValue('level', value);
                    setFieldTouched('level', true, false);
                  }}
                  difficultyError={(touched.level || submitCount > 0) ? (errors.level as string) : ''}

                  showQuestionCount={true}
                  questionCountValue={values.count}
                  onQuestionCountChange={(text) => setFieldValue('count', text)}

                  additionalInstructionsValue={values.itext}
                  onAdditionalInstructionsChange={(text) => setFieldValue('itext', text)}
                  onAdditionalInstructionsBlur={() => handleBlur('itext')({} as any)}
                  additionalInstructionsError={(touched.itext || submitCount > 0) ? (errors.itext as string) : ''}
                />
              </View>
            </ScrollView>

            <View style={styles.footer}>
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
});
