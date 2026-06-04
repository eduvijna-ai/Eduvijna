import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@context/ThemeContext';
import { useAuth } from '@core/hooks/useAuth';
import useNotifications from '@core/hooks/useNotifications';
import {
  generateAIQuiz,
  generateCompetitiveAIQuiz,
  saveUserAssessment,
} from '../core/services/sharedApi';
import {
  getSubjectsByClass,
  getStreams,
  getExams,
  getCategories,
  getExamSubjects,
  type GenericDropdownItem,
} from '../core/services/dropdown';
import { useDropdowns } from '../context/DropdownContext';
import LoadingSpinner from '../components/LoadingSpinner';

type Mode = 'general' | 'competitive';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'te', label: 'Telugu' },
  { value: 'ta', label: 'Tamil' },
  { value: 'kn', label: 'Kannada' },
  { value: 'ml', label: 'Malayalam' },
  { value: 'mr', label: 'Marathi' },
  { value: 'bn', label: 'Bengali' },
  { value: 'gu', label: 'Gujarati' },
  { value: 'pa', label: 'Punjabi' },
];

const COUNT_OPTIONS = ['5', '10', '15', '20'];

export default function CreateAIQuizScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { refreshAfterQuizGenerated } = useNotifications();
  const { classes, difficultyLevels, refreshAll } = useDropdowns();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => createStyles(theme.colors), [theme.colors]);

  const [mode, setMode] = useState<Mode>('general');
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [general, setGeneral] = useState({
    classId: '',
    subjectId: '',
    lesson: '',
    subLesson: '',
    topic: '',
    language: 'en',
    levelId: '',
    count: '10',
    itext: '',
  });

  const [competitive, setCompetitive] = useState({
    streamId: '',
    examId: '',
    categoryId: '',
    subjectId: '',
    topic: '',
    language: 'en',
    levelId: '',
    count: '10',
    itext: '',
  });

  const [generalSubjects, setGeneralSubjects] = useState<GenericDropdownItem[]>([]);
  const [streams, setStreams] = useState<GenericDropdownItem[]>([]);
  const [exams, setExams] = useState<GenericDropdownItem[]>([]);
  const [categories, setCategories] = useState<GenericDropdownItem[]>([]);
  const [examSubjects, setExamSubjects] = useState<GenericDropdownItem[]>([]);

  const resolvedSchoolId = React.useMemo(() => {
    const toNum = (v: any): number | undefined => {
      if (v === null || v === undefined || v === '') return undefined;
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    return (
      toNum((user as any)?.school_id) ??
      toNum((user as any)?.schoolId) ??
      toNum((user as any)?.school?.id) ??
      toNum((user as any)?.school?.school_id) ??
      toNum((user as any)?.profile?.school?.id) ??
      toNum((user as any)?.profile?.school_id) ??
      toNum((user as any)?.profile?.schoolId) ??
      undefined
    );
  }, [user]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!general.classId) {
      setGeneralSubjects([]);
      setGeneral((prev) => ({ ...prev, subjectId: '' }));
      return;
    }

    let active = true;
    getSubjectsByClass(general.classId, { school_id: resolvedSchoolId })
      .then((response) => {
        if (!active) return;
        setGeneralSubjects((response.items as unknown as GenericDropdownItem[]) || []);
      })
      .catch(() => {
        if (!active) return;
        setGeneralSubjects([]);
      });

    return () => {
      active = false;
    };
  }, [general.classId, resolvedSchoolId]);

  useEffect(() => {
    if (mode !== 'competitive') return;

    let active = true;
    Promise.all([
      getStreams({ school_id: resolvedSchoolId, per_page: 100, exact: false }),
      getCategories({ school_id: resolvedSchoolId, per_page: 100, exact: false }),
    ])
      .then(([s, c]) => {
        if (!active) return;
        setStreams(s.items || []);
        setCategories(c.items || []);
      })
      .catch(() => {
        if (!active) return;
        setStreams([]);
        setCategories([]);
      });

    return () => {
      active = false;
    };
  }, [mode, resolvedSchoolId]);

  useEffect(() => {
    if (!competitive.streamId || mode !== 'competitive') {
      setExams([]);
      return;
    }

    let active = true;
    getExams({ school_id: resolvedSchoolId, stream_id: Number(competitive.streamId), per_page: 100, exact: false })
      .then((response) => {
        if (!active) return;
        setExams(response.items || []);
      })
      .catch(() => {
        if (!active) return;
        setExams([]);
      });

    return () => {
      active = false;
    };
  }, [competitive.streamId, mode, resolvedSchoolId]);

  useEffect(() => {
    if (!competitive.examId || mode !== 'competitive') {
      setExamSubjects([]);
      return;
    }

    let active = true;
    getExamSubjects({ school_id: resolvedSchoolId, exam_id: Number(competitive.examId), per_page: 100, exact: false })
      .then((response) => {
        if (!active) return;
        setExamSubjects(response.items || []);
      })
      .catch(() => {
        if (!active) return;
        setExamSubjects([]);
      });

    return () => {
      active = false;
    };
  }, [competitive.examId, mode, resolvedSchoolId]);

  const findById = (list: Array<{ id: string; name?: string; label?: string; slug?: string }>, id: string) =>
    list.find((item) => String(item.id) === String(id));

  const validateGeneral = () => {
    if (!general.classId) return 'Please select class';
    if (!general.subjectId) return 'Please select subject';
    if (!general.lesson.trim()) return 'Please enter lesson/topic';
    if (!general.levelId) return 'Please select difficulty level';
    if (!general.itext.trim()) return 'Please add additional instructions';
    return '';
  };

  const validateCompetitive = () => {
    if (!competitive.streamId) return 'Please select stream';
    if (!competitive.examId) return 'Please select exam';
    if (!competitive.categoryId) return 'Please select category';
    if (!competitive.subjectId) return 'Please select subject';
    if (!competitive.topic.trim()) return 'Please enter topic';
    if (!competitive.levelId) return 'Please select difficulty level';
    if (!competitive.itext.trim()) return 'Please add additional instructions';
    return '';
  };

  const handleGenerate = async () => {
    setSubmitError('');
    const validationError = mode === 'general' ? validateGeneral() : validateCompetitive();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setLoading(true);
    try {
      if (mode === 'general') {
        const selectedClass = findById(classes as any, general.classId);
        const selectedSubject = findById(generalSubjects as any, general.subjectId);
        const selectedLevel = findById(difficultyLevels as any, general.levelId);

        const result = await generateAIQuiz({
          class: selectedClass?.name || selectedClass?.label || general.classId,
          subject: selectedSubject?.name || selectedSubject?.label || general.subjectId,
          lesson: general.lesson.trim(),
          topic: general.topic.trim() || 'N/A',
          language: general.language,
          level: selectedLevel?.slug || selectedLevel?.name || general.levelId,
          count: parseInt(general.count, 10) || 10,
          itext: general.itext.trim(),
        });

        const processedQuestions = result?.quiz || [];
        await refreshAfterQuizGenerated();

        navigation.replace('QuizTakingScreen', {
          quizData: {
            id: result.quiz_id,
            title: `${general.lesson.trim()} Assessment`,
            questions: processedQuestions,
            class: selectedClass?.name,
            subject: selectedSubject?.name,
            difficulty: selectedLevel?.name,
            lesson: general.lesson.trim(),
            sub_lesson: general.subLesson.trim(),
            topic: general.topic.trim(),
            additional_instructions: general.itext.trim(),
            thread_id: result.thread_id,
            thread_slug: result.thread_slug,
            reused_thread: result.reused_thread,
          },
          showShareButton: true,
          showActionButtons: true,
        });

        try {
          await saveUserAssessment({
            title: `${general.lesson.trim()} Assessment`,
            subject: selectedSubject?.name || selectedSubject?.label || general.subjectId,
            class_name: selectedClass?.name || selectedClass?.label || general.classId,
            level: selectedLevel?.name || general.levelId,
            lesson: general.lesson.trim(),
            questions: processedQuestions.map((q: any) => ({
              quiz: {
                question: q.question,
                options: q.options,
                answer: q.answer || q.correctAnswer || 'A',
                explanation: q.explanation || '',
              },
              answer: q.answer || q.correctAnswer || 'A',
            })),
            assessment_type: 'quiz',
            source: 'General',
            school_id: resolvedSchoolId,
          });
        } catch {
          // Save failure is non-critical
        }
      } else {
        const selectedStream = findById(streams as any, competitive.streamId);
        const selectedExam = findById(exams as any, competitive.examId);
        const selectedCategory = findById(categories as any, competitive.categoryId);
        const selectedSubject = findById(examSubjects as any, competitive.subjectId);
        const selectedLevel = findById(difficultyLevels as any, competitive.levelId);

        const result = await generateCompetitiveAIQuiz({
          exam: selectedExam?.name || selectedExam?.label || competitive.examId,
          count: parseInt(competitive.count, 10) || 10,
          itext: competitive.itext.trim(),
          stream: selectedStream?.slug || selectedStream?.name || competitive.streamId,
          category: selectedCategory?.name || selectedCategory?.label || competitive.categoryId,
          subject_requirement: 'Any Stream',
          subject: selectedSubject?.name || selectedSubject?.label || competitive.subjectId,
          topic: competitive.topic.trim(),
          level: selectedLevel?.name || competitive.levelId,
          input_text: selectedExam?.slug || selectedExam?.name || competitive.examId,
          language: competitive.language,
        });

        const processedQuestions = result?.quiz || [];
        await refreshAfterQuizGenerated();

        navigation.replace('QuizTakingScreen', {
          quizData: {
            id: result.quiz_id,
            title: `${competitive.topic.trim()} Competitive Assessment`,
            questions: processedQuestions,
            stream: selectedStream?.name,
            exam: selectedExam?.name,
            category: selectedCategory?.name,
            subject: selectedSubject?.name,
            difficulty: selectedLevel?.name,
            topic: competitive.topic.trim(),
            additional_instructions: competitive.itext.trim(),
            thread_id: result.thread_id,
            thread_slug: result.thread_slug,
            reused_thread: result.reused_thread,
          },
          showShareButton: true,
          showActionButtons: true,
        });

        try {
          await saveUserAssessment({
            title: `${competitive.topic.trim()} Competitive Assessment`,
            subject: selectedSubject?.name || selectedSubject?.label || competitive.subjectId,
            class_name: selectedExam?.name || competitive.examId,
            level: selectedLevel?.name || competitive.levelId,
            lesson: competitive.topic.trim(),
            questions: processedQuestions.map((q: any) => ({
              quiz: {
                question: q.question,
                options: q.options,
                answer: q.answer || q.correctAnswer || 'A',
                explanation: q.explanation || '',
              },
              answer: q.answer || q.correctAnswer || 'A',
            })),
            assessment_type: 'quiz',
            source: 'Competitive',
            school_id: resolvedSchoolId,
          });
        } catch {
          // Save failure is non-critical
        }
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to generate assessment';
      setSubmitError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const renderPicker = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    items: Array<{ id: string; name?: string; label?: string }>,
    placeholder: string,
    required = false,
    disabled = false,
  ) => (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}{required ? ' *' : ''}</Text>
      <View style={[styles.pickerWrap, disabled && styles.disabledField]}>
        <Picker
          enabled={!disabled}
          selectedValue={value}
          onValueChange={(val) => onChange(String(val))}
          style={styles.picker}
          dropdownIconColor={theme.colors.textSecondary}
        >
          <Picker.Item label={placeholder} value="" color={theme.colors.textSecondary} />
          {items.map((item) => (
            <Picker.Item
              key={String(item.id)}
              label={item.name || item.label || String(item.id)}
              value={String(item.id)}
              color={theme.colors.text}
            />
          ))}
        </Picker>
      </View>
    </View>
  );

  const renderGeneral = () => (
    <>
      <Text style={styles.sectionCaption}>ACADEMIC CONTEXT</Text>
      {renderPicker('Class', general.classId, (v) => setGeneral((p) => ({ ...p, classId: v, subjectId: '' })), classes as any, 'Select class...', true)}
      {renderPicker('Subject', general.subjectId, (v) => setGeneral((p) => ({ ...p, subjectId: v })), generalSubjects as any, 'Select subject...', true, !general.classId)}

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Lesson *</Text>
        <TextInput
          style={styles.textInput}
          value={general.lesson}
          onChangeText={(text) => setGeneral((p) => ({ ...p, lesson: text }))}
          placeholder="Enter lesson name"
          placeholderTextColor={theme.colors.textSecondary}
        />
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Sub Lesson</Text>
        <TextInput
          style={styles.textInput}
          value={general.subLesson}
          onChangeText={(text) => setGeneral((p) => ({ ...p, subLesson: text }))}
          placeholder="Sub lesson (optional)"
          placeholderTextColor={theme.colors.textSecondary}
        />
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Topic</Text>
        <TextInput
          style={styles.textInput}
          value={general.topic}
          onChangeText={(text) => setGeneral((p) => ({ ...p, topic: text }))}
          placeholder="Narrow down a specific topic"
          placeholderTextColor={theme.colors.textSecondary}
        />
      </View>

      {renderPicker('Language', general.language, (v) => setGeneral((p) => ({ ...p, language: v })), LANGUAGES.map((x) => ({ id: x.value, name: x.label })), 'Select language...')}
      {renderPicker('Difficulty Level', general.levelId, (v) => setGeneral((p) => ({ ...p, levelId: v })), difficultyLevels as any, 'Select difficulty...', true)}

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Number of Questions</Text>
        <View style={styles.countRow}>
          {COUNT_OPTIONS.map((count) => (
            <TouchableOpacity
              key={count}
              style={[styles.countChip, general.count === count && styles.countChipActive]}
              onPress={() => setGeneral((p) => ({ ...p, count }))}
            >
              <Text style={[styles.countChipText, general.count === count && styles.countChipTextActive]}>{count}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Additional Instructions (Optional)</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={general.itext}
          onChangeText={(text) => setGeneral((p) => ({ ...p, itext: text }))}
          placeholder="Add specific topics or keywords to focus the assessment"
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          textAlignVertical="top"
        />
      </View>
    </>
  );

  const renderCompetitive = () => (
    <>
      <Text style={styles.sectionCaption}>COMPETITIVE EXAM CONTEXT</Text>
      {renderPicker('Stream', competitive.streamId, (v) => setCompetitive((p) => ({ ...p, streamId: v, examId: '', subjectId: '' })), streams as any, 'Select stream...', true)}
      {renderPicker('Exam', competitive.examId, (v) => setCompetitive((p) => ({ ...p, examId: v, subjectId: '' })), exams as any, 'Select exam...', true, !competitive.streamId)}
      {renderPicker('Category', competitive.categoryId, (v) => setCompetitive((p) => ({ ...p, categoryId: v })), categories as any, 'Select category...', true)}
      {renderPicker('Subject', competitive.subjectId, (v) => setCompetitive((p) => ({ ...p, subjectId: v })), examSubjects as any, 'Select subject...', true, !competitive.examId)}

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Topic *</Text>
        <TextInput
          style={styles.textInput}
          value={competitive.topic}
          onChangeText={(text) => setCompetitive((p) => ({ ...p, topic: text }))}
          placeholder="Enter topic (e.g. Thermodynamics)"
          placeholderTextColor={theme.colors.textSecondary}
        />
      </View>

      {renderPicker('Language', competitive.language, (v) => setCompetitive((p) => ({ ...p, language: v })), LANGUAGES.map((x) => ({ id: x.value, name: x.label })), 'Select language...')}
      {renderPicker('Difficulty Level', competitive.levelId, (v) => setCompetitive((p) => ({ ...p, levelId: v })), difficultyLevels as any, 'Select difficulty...', true)}

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Number of Questions</Text>
        <View style={styles.countRow}>
          {COUNT_OPTIONS.map((count) => (
            <TouchableOpacity
              key={count}
              style={[styles.countChip, competitive.count === count && styles.countChipActive]}
              onPress={() => setCompetitive((p) => ({ ...p, count }))}
            >
              <Text style={[styles.countChipText, competitive.count === count && styles.countChipTextActive]}>{count}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Additional Instructions (Optional)</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={competitive.itext}
          onChangeText={(text) => setCompetitive((p) => ({ ...p, itext: text }))}
          placeholder="Add specific keywords or context"
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          textAlignVertical="top"
        />
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.formWrap}>
          <Text style={styles.pageTitle}>Create AI Assessment</Text>
          <Text style={styles.pageSubTitle}>Configure your assessment details</Text>

          <Text style={styles.sectionCaption}>ASSESSMENT MODE</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'general' && styles.modeBtnActive]}
              onPress={() => setMode('general')}
            >
              <Text style={[styles.modeBtnText, mode === 'general' && styles.modeBtnTextActive]}>General</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'competitive' && styles.modeBtnActive]}
              onPress={() => setMode('competitive')}
            >
              <Text style={[styles.modeBtnText, mode === 'competitive' && styles.modeBtnTextActive]}>Competitive Exam</Text>
            </TouchableOpacity>
          </View>

          {mode === 'general' ? renderGeneral() : renderCompetitive()}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(16, insets.bottom) }]}>
        {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
        <TouchableOpacity
          style={[styles.generateButton, loading && styles.buttonDisabled]}
          disabled={loading}
          onPress={handleGenerate}
        >
          {loading ? (
            <LoadingSpinner size={20} />
          ) : (
            <Text style={styles.generateButtonText}>
              {mode === 'competitive' ? '✨ Generate Competitive Quiz' : '✨ Generate Assessment'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: 140,
    },
    formWrap: {
      paddingHorizontal: 12,
      paddingTop: 10,
    },
    pageTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
    },
    pageSubTitle: {
      marginTop: 4,
      marginBottom: 12,
      fontSize: 13,
      color: colors.textSecondary,
    },
    sectionCaption: {
      marginTop: 10,
      marginBottom: 8,
      fontSize: 11,
      fontWeight: '700',
      color: '#8A94A6',
      letterSpacing: 0.6,
    },
    modeRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    modeBtn: {
      flex: 1,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      backgroundColor: colors.cardBackground,
    },
    modeBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    modeBtnText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    modeBtnTextActive: {
      color: colors.buttonText,
    },
    fieldBlock: {
      marginBottom: 10,
    },
    fieldLabel: {
      marginBottom: 5,
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    pickerWrap: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.cardBackground,
      overflow: 'hidden',
    },
    picker: {
      color: colors.text,
      minHeight: 48,
    },
    disabledField: {
      opacity: 0.6,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 12,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 14,
    },
    textArea: {
      minHeight: 86,
    },
    countRow: {
      flexDirection: 'row',
      gap: 8,
    },
    countChip: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
    },
    countChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    countChipText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    countChipTextActive: {
      color: colors.buttonText,
    },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 12,
      paddingTop: 10,
    },
    submitError: {
      color: '#EF4444',
      marginBottom: 8,
      fontSize: 13,
      fontWeight: '500',
    },
    generateButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      minHeight: 50,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    generateButtonText: {
      color: colors.buttonText,
      fontSize: 15,
      fontWeight: '700',
    },
  });
