import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';
import useNotifications from '@core/hooks/useNotifications';
import { generateAIQuiz } from '../core/services/sharedApi';
import { getClasses, getSubjects, ClassItem, SubjectItem } from '../core/services/dropdown';
import QuizFormFields from '../components/QuizFormFields';

export default function CreateAIQuizScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { refreshAfterQuizGenerated } = useNotifications();
  const styles = React.useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [formData, setFormData] = useState({
    class: '',
    subject: '',
    lesson: '',
    level: 'basic',
    count: '5',
    itext: '',
  });
  const [loading, setLoading] = useState(false);
  
  // Dropdown data from API
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [classError, setClassError] = useState('');
  const [subjectError, setSubjectError] = useState('');

  const levels = ['basic', 'intermediate', 'advanced'];

  // Load classes on component mount
  useEffect(() => {
    loadClasses();
  }, []);

  // Load subjects when component mounts
  useEffect(() => {
    loadSubjects();
  }, []);

  const loadClasses = async () => {
    setIsLoadingClasses(true);
    setClassError('');
    try {
      const response = await getClasses();
      //console.log('Classes loaded:', response.items.length, 'items');
      setClasses(response.items);
    } catch (error) {
      console.error('Failed to load classes:', error);
      setClassError('Failed to load classes. Using default values.');
    } finally {
      setIsLoadingClasses(false);
    }
  };

  const loadSubjects = async () => {
    setIsLoadingSubjects(true);
    setSubjectError('');
    try {
      const response = await getSubjects();
      console.log('Subjects loaded:', response.items.length, 'items');
      setSubjects(response.items);
    } catch (error) {
      console.error('Failed to load subjects:', error);
      setSubjectError('Failed to load subjects. Using default values.');
    } finally {
      setIsLoadingSubjects(false);
    }
  };



  const handleGenerate = async () => {
    if (!formData.class || !formData.subject || !formData.lesson) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const result = await generateAIQuiz({
        class: formData.class,
        subject: formData.subject,
        lesson: formData.lesson,
        level: formData.level,
        count: parseInt(formData.count) || 5,
        itext: formData.itext,
      });
      
      await refreshAfterQuizGenerated();
      
      // Use replace to prevent going back to creation screen and avoid refresh
      navigation.replace('QuizTakingScreen', {
        quizData: {
          id: result.quiz_id,
          title: `${formData.lesson} Quiz`,
          questions: result.quiz || [],
          class: classes.find((c: any) => c.id === formData.class)?.name,
          subject: subjects.find((s: any) => s.id === formData.subject)?.name,
          difficulty: formData.level,
          lesson: formData.lesson,
          additional_instructions: formData.itext || '',
          // Thread data from the actual quiz generation
          thread_id: result.thread_id,
          thread_slug: result.thread_slug,
          reused_thread: result.reused_thread,
          // Regeneration parameters
          regenerationParams: {
            type: 'ai',
            classId: formData.class,
            subjectId: formData.subject,
            count: parseInt(formData.count) || 5,
            itext: formData.itext,
          },
        },
        showShareButton: true,
        showActionButtons: true,
      });
    } catch (error: any) {
      console.error('Quiz generation error:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to generate quiz';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Close Button */}
      <View style={styles.headerBar}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create AI Quiz</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.form}>
        <QuizFormFields
          showClass={true}
          classValue={formData.class}
          onClassChange={(value) => setFormData({ ...formData, class: value })}
          classes={classes}
          isLoadingClasses={isLoadingClasses}
          classError={classError}
          
          showSubject={true}
          subjectValue={formData.subject}
          onSubjectChange={(value) => setFormData({ ...formData, subject: value })}
          subjects={subjects}
          isLoadingSubjects={isLoadingSubjects}
          subjectError={subjectError}
          
          showLesson={true}
          lessonValue={formData.lesson}
          onLessonChange={(text) => setFormData({ ...formData, lesson: text })}
          lessonPlaceholder="e.g., Simple Present Tense"
          lessonLabel="Lesson/Topic"
          
          showDifficultyLevel={true}
          difficultyValue={formData.level}
          onDifficultyChange={(value) => setFormData({ ...formData, level: value })}
          difficultyLevels={levels.map(l => ({ id: l, name: l.charAt(0).toUpperCase() + l.slice(1) }))}
          
          showQuestionCount={true}
          questionCountValue={formData.count}
          onQuestionCountChange={(text) => setFormData({ ...formData, count: text })}
          
          additionalInstructionsValue={formData.itext}
          onAdditionalInstructionsChange={(text) => setFormData({ ...formData, itext: text })}
        />

        <TouchableOpacity
          style={[styles.generateButton, loading && styles.buttonDisabled]}
          onPress={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size={20} />
          ) : (
            <Text style={styles.generateButtonText}>Generate Quiz</Text>
          )}
        </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingBottom: 40,
  },
  form: {
    padding: 16,
    paddingTop: 12,
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
  levelContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  levelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
  },
  levelButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  levelButtonText: {
    fontSize: 14,
    color: colors.text,
  },
  levelButtonTextActive: {
    color: colors.buttonText,
    fontWeight: '600',
  },
  generateButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
});
