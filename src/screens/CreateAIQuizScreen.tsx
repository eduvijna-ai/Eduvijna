import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';
import QuizFormFields from '../components/QuizFormFields';
import DocumentListPanel from '../components/DocumentListPanel';
import DocumentDetailsPanel from '../components/DocumentDetailsPanel';
import { generateAIQuiz } from '../core/services/sharedApi';
import { colors } from '@core/theme/theme';
import useNotifications from '@core/hooks/useNotifications';

interface Props {
  navigation?: any;
  route?: any;
  onBack?: () => void;
}

export default function CreateAIQuizScreen({ navigation, onBack }: Props) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isWeb = width > 768;
  const { refreshAfterQuizGenerated } = useNotifications();

  const [formData, setFormData] = useState({
    class: '',
    subject: '',
    lesson: '',
    level: '',
    count: '10',
    itext: '',
  });
  const [loading, setLoading] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  const handleDocumentSelect = (document: any) => {
    setSelectedDocumentId(document.id);
    setSelectedDocument(document);
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
        level: formData.level || 'basic',
        count: parseInt(formData.count) || 5,
        itext: formData.itext,
      });
      
      console.log('✅ AI Assessment generated:', result);
      
      // Refresh notifications after quiz creation
      await refreshAfterQuizGenerated();
      
      // Navigate to QuizTakingScreen with generated quiz data
      navigation.navigate('QuizTakingScreen', {
        quizData: {
          id: result.quiz_id,
          title: `${formData.lesson} Assessment`,
          questions: result.quiz || [],
          class: formData.class,
          subject: formData.subject,
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
      console.error('Assessment generation error:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to generate assessment';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };


  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {isWeb ? (
        // Web 3-Panel Layout
        <View style={styles.threePanelLayout}>
          {/* Left Panel - Document List (Shared Component) */}
          <DocumentListPanel
            selectedDocumentId={selectedDocumentId}
            onDocumentSelect={handleDocumentSelect}
          />

          {/* Center Panel - Form */}
          <View style={styles.centerPanel}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <Ionicons name="sparkles" size={48} color="#8B5CF6" />
                </View>
                <Text style={styles.title}>AI Assessment Generator</Text>
                <Text style={styles.subtitle}>Generate assessment using AI</Text>
              </View>
              <View style={styles.form}>
          <QuizFormFields
            showClass={true}
            classValue={formData.class}
            onClassChange={(value) => setFormData({ ...formData, class: value })}
            
            showSubject={true}
            subjectValue={formData.subject}
            onSubjectChange={(value) => setFormData({ ...formData, subject: value })}
            
            showLesson={true}
            lessonValue={formData.lesson}
            onLessonChange={(text) => setFormData({ ...formData, lesson: text })}
            lessonPlaceholder="e.g., Simple Present Tense"
            lessonLabel="Lesson/Topic"
            
            showDifficultyLevel={true}
            difficultyValue={formData.level}
            onDifficultyChange={(value) => setFormData({ ...formData, level: value })}
            
            showQuestionCount={true}
            questionCountValue={formData.count}
            onQuestionCountChange={(text) => setFormData({ ...formData, count: text })}
            
            showAdditionalInstructions={true}
            additionalInstructionsValue={formData.itext}
            onAdditionalInstructionsChange={(text) => setFormData({ ...formData, itext: text })}
          />

          <TouchableOpacity
            style={[styles.generateButton, loading && styles.buttonDisabled]}
            onPress={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#fff" />
                <Text style={styles.generateButtonText}>Generate {formData.count} Questions</Text>
              </>
            )}
          </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          {/* Right Panel - Document Details (Shared Component) */}
          <DocumentDetailsPanel selectedDocument={selectedDocument} />
        </View>
      ) : (
        // Mobile Single Column
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="sparkles" size={48} color="#8B5CF6" />
            </View>
            <Text style={styles.title}>AI Assessment Generator</Text>
            <Text style={styles.subtitle}>Generate assessment using AI</Text>
          </View>
          <View style={styles.form}>
            <QuizFormFields
              showClass={true}
              classValue={formData.class}
              onClassChange={(value) => setFormData({ ...formData, class: value })}
              
              showSubject={true}
              subjectValue={formData.subject}
              onSubjectChange={(value) => setFormData({ ...formData, subject: value })}
              
              showLesson={true}
              lessonValue={formData.lesson}
              onLessonChange={(text) => setFormData({ ...formData, lesson: text })}
              lessonPlaceholder="e.g., Simple Present Tense"
              lessonLabel="Lesson/Topic"
              
              showDifficultyLevel={true}
              difficultyValue={formData.level}
              onDifficultyChange={(value) => setFormData({ ...formData, level: value })}
              
              showQuestionCount={true}
              questionCountValue={formData.count}
              onQuestionCountChange={(text) => setFormData({ ...formData, count: text })}
              
              showAdditionalInstructions={true}
              additionalInstructionsValue={formData.itext}
              onAdditionalInstructionsChange={(text) => setFormData({ ...formData, itext: text })}
            />

            <TouchableOpacity
              style={[styles.generateButton, loading && styles.buttonDisabled]}
              onPress={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color="#fff" />
                  <Text style={styles.generateButtonText}>Generate {formData.count} Questions</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  threePanelLayout: {
    flexDirection: 'row',
    flex: 1,
    gap: 16,
    padding: 16,
  },
  centerPanel: {
    flex: 3,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  form: {
    gap: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 0,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  generateButton: {
    backgroundColor: '#8B5CF6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 10,
    marginTop: 32,
    gap: 10,
    elevation: 3,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
