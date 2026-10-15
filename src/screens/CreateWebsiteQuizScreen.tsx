import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';
import LoadingSpinner from '../components/LoadingSpinner';
import useNotifications from '@core/hooks/useNotifications';
import { generateQuizFromWebsite } from '../core/services/quizzes';
import QuizFormFields from '../components/QuizFormFields';
import { useDropdowns } from '../context/DropdownContext';

interface WebsiteSummary {
  id: number;
  title: string;
  created_at: string;
  url?: string;
}

import { useQuizNavAccessRedirect } from '@core/hooks/useQuizNavAccessRedirect';

export default function CreateWebsiteQuizScreen({ navigation }: any) {
  useQuizNavAccessRedirect('CreateWebsiteQuizScreen', navigation);
  const { theme } = useTheme();
  const { refreshAfterQuizGenerated } = useNotifications();
  const insets = useSafeAreaInsets();
  const { classes, subjects } = useDropdowns();
  const styles = React.useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'none' | 'valid' | 'invalid'>('none');
  const [validationMessage, setValidationMessage] = useState('');
  const [recentSummaries, setRecentSummaries] = useState<WebsiteSummary[]>([]);
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(false);
  
  // Two-step flow state
  const [currentStep, setCurrentStep] = useState<'input' | 'configuration'>('input');
  
  // Form data for Class/Subject/Level (inline, not modal)
  const [quizQuestionCount, setQuizQuestionCount] = useState(5);
  const [lesson, setLesson] = useState('');
  const [level, setLevel] = useState('intermediate');
  const [subject, setSubject] = useState('');
  const [classValue, setClassValue] = useState('');

  useEffect(() => {
    loadRecentSummaries();
  }, []);

  const loadRecentSummaries = async () => {
    setIsLoadingSummaries(true);
    try {
      // Mock data for now - replace with actual API call
      const mockData: WebsiteSummary[] = [
        {
          id: 1,
          title: "Wikipedia Article on Physics",
          created_at: new Date().toISOString(),
          url: "https://en.wikipedia.org/wiki/Physics"
        },
        {
          id: 2,
          title: "Khan Academy Math Lesson",
          created_at: new Date().toISOString(),
          url: "https://www.khanacademy.org/math"
        }
      ];
      setRecentSummaries(mockData);
    } catch (error) {
      console.error('Failed to load recent summaries:', error);
    } finally {
      setIsLoadingSummaries(false);
    }
  };

  const validateWebsiteUrl = (url: string): boolean => {
    const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    return urlRegex.test(url);
  };

  const handleValidateAndGenerate = async () => {
    if (!websiteUrl.trim()) {
      Alert.alert('Error', 'Please enter a website URL');
      return;
    }

    if (!validateWebsiteUrl(websiteUrl)) {
      Alert.alert('Error', 'Please enter a valid website URL');
      return;
    }

    // Step 1: Validate website
    setIsValidating(true);
    setValidationStatus('none');
    setValidationMessage('');

    try {
      // Here you would validate the website content
      // For now, we'll simulate validation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setValidationStatus('valid');
      setValidationMessage('✅ Website validated! Please configure your quiz below.');
      setIsValidating(false);

      // Move to configuration step
      setTimeout(() => {
        setCurrentStep('configuration');
        // Auto-populate lesson from URL domain if empty
        if (!lesson) {
          try {
            const domain = new URL(websiteUrl).hostname.replace('www.', '');
            setLesson(domain.split('.')[0]);
          } catch (e) {
            // Invalid URL, ignore
          }
        }
      }, 500);

    } catch (error) {
      setValidationStatus('invalid');
      setValidationMessage('❌ Unable to access this website or extract content. Please try a different URL.');
      setIsValidating(false);
    }
  };

  const generateQuiz = async () => {
    // Validate form data
    if (!classValue || !subject || !lesson) {
      Alert.alert('Error', 'Please fill in Class, Subject, and Lesson fields');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Always pass instructions - use a default if empty
      const instructions = additionalInstructions.trim() || 'Generate quiz questions from the website content';
      
      console.log('Generating quiz with:', { url: websiteUrl, instructions });
      
      const result = await generateQuizFromWebsite(websiteUrl, level, instructions);
      
      console.log('Website quiz result:', result);
      
      // Check if we got valid quiz data
      if (!result || (!result.quiz && !result.questions)) {
        throw new Error('No quiz questions were generated from the website');
      }
      
      await refreshAfterQuizGenerated();
      
      // Navigate to quiz taking screen with the generated quiz
      navigation.navigate('QuizTakingScreen', {
        quizData: {
          id: result.quiz_id || 'website-quiz',
          title: lesson || result.title || 'Website Quiz',
          questions: result.quiz || [],
          class: classes.find((c: any) => c.id === classValue)?.name,
          subject: subjects.find((s: any) => s.id === subject)?.name,
          difficulty: level,
          lesson: lesson || result.title || 'Website Topic',
          additional_instructions: instructions,
          thread_id: result.thread_id,
          thread_slug: result.thread_slug,
          regenerationParams: {
            type: 'website',
            weblink: websiteUrl,
            studentLevel: level,
            classId: classValue,
            subjectId: subject,
            count: quizQuestionCount,
            itext: result.summary || instructions,
          },
        },
        showShareButton: true,
        showActionButtons: true,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate quiz from website');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectRecentSummary = async (summary: WebsiteSummary) => {
    Alert.alert(
      'Use Recent Website',
      `Generate quiz from "${summary.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Generate Quiz',
          onPress: async () => {
            setIsGenerating(true);
            try {
              // Use the URL from the recent summary to regenerate quiz
              const url = summary.url;
              
              if (!url || !url.trim()) {
                throw new Error('Website URL not found in summary. Please enter the URL manually.');
              }
              
              const instructions = additionalInstructions.trim() || 'Generate quiz questions from the website content';
              
              const result = await generateQuizFromWebsite(url, 'intermediate', instructions);
              
              if (!result || (!result.quiz && !result.questions)) {
                throw new Error('No quiz questions were generated');
              }
              
              await refreshAfterQuizGenerated();
              
              navigation.navigate('QuizTakingScreen', {
                quizData: {
                  id: result.quiz_id || 'website-quiz',
                  title: summary.title || result.title || 'Website Quiz',
                  questions: result.quiz || result.questions || [],
                  difficulty: 'intermediate',
                  lesson: summary.title || 'Website Topic',
                  additional_instructions: instructions,
                  thread_id: result.thread_id,
                  thread_slug: result.thread_slug,
                  regenerationParams: {
                    type: 'website',
                    weblink: url,
                    studentLevel: 'middle_school',
                    classId: '',
                    subjectId: '',
                    count: result.quiz?.length || result.questions?.length || 5,
                    itext: result.summary || instructions,
                  },
                },
                showShareButton: true,
                showActionButtons: true,
              });
            } catch (error: any) {
              console.error('Error generating quiz from recent summary:', error);
              Alert.alert('Error', error.message || 'Failed to generate quiz from website');
            } finally {
              setIsGenerating(false);
            }
          }
        }
      ]
    );
  };

  const renderRecentSummary = ({ item }: { item: WebsiteSummary }) => (
    <TouchableOpacity
      style={styles.summaryItem}
      onPress={() => handleSelectRecentSummary(item)}
    >
      <Text style={styles.summaryTitle}>{item.title}</Text>
      <Text style={styles.summaryDate}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

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
        <Text style={styles.headerTitle}>Create Website Quiz</Text>
        <View style={styles.headerPlaceholder} />
      </View> */}

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(40, insets.bottom + 20) }]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>🌐 Website Quiz</Text>
          <Text style={styles.subtitle}>Generate quiz from website content</Text>
        </View>

      {/* Step 1: URL Input & Validation */}
      {currentStep === 'input' && (
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Website URL *</Text>
            <TextInput
              style={styles.input}
              placeholder="https://example.com/article"
              value={websiteUrl}
              onChangeText={setWebsiteUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Text style={styles.hint}>Enter the URL of a website with educational content</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Additional Instructions (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g., Focus on key concepts, create questions about..."
              placeholderTextColor="#999999"
              multiline
              numberOfLines={4}
              value={additionalInstructions}
              onChangeText={setAdditionalInstructions}
            />
            <Text style={styles.hint}>Provide specific instructions for the quiz generation</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.generateButton,
              (isValidating || isGenerating) && styles.buttonDisabled
            ]}
            onPress={handleValidateAndGenerate}
            disabled={isValidating || isGenerating}
          >
            <Text style={styles.generateButtonText}>
              {isValidating ? 'Validating...' : '✓ Validate Website'}
            </Text>
          </TouchableOpacity>

          {/* Validation Status */}
          {(isValidating || validationStatus !== 'none') && (
            <View style={styles.statusContainer}>
              {isValidating && (
                <View style={styles.statusRow}>
                  <LoadingSpinner size={30} />
                  <Text style={styles.statusText}>Validating website...</Text>
                </View>
              )}
              {validationMessage !== '' && (
                <Text style={[
                  styles.validationMessage,
                  validationStatus === 'valid' ? styles.validMessage : styles.invalidMessage
                ]}>
                  {validationMessage}
                </Text>
              )}
            </View>
          )}

          {/* Recent Summaries Section */}
          {recentSummaries.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.sectionTitle}>📋 Recent Website Summaries</Text>
              <Text style={styles.sectionSubtitle}>Or generate quiz from a recent website</Text>
              
              {isLoadingSummaries ? (
                <View style={styles.loadingContainer}>
                  <LoadingSpinner size={30} />
                  <Text style={styles.loadingText}>Loading recent summaries...</Text>
                </View>
              ) : (
                <FlatList
                  data={recentSummaries}
                  renderItem={renderRecentSummary}
                  keyExtractor={(item) => item.id.toString()}
                  style={styles.summariesList}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
          )}

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>💡 How it works:</Text>
            <Text style={styles.infoText}>• Extracts text content from web pages</Text>
            <Text style={styles.infoText}>• Analyzes articles, documentation, and educational content</Text>
            <Text style={styles.infoText}>• Creates comprehensive questions based on the content</Text>
            <Text style={styles.infoText}>• Works with blogs, articles, tutorials, and reference materials</Text>
          </View>
        </View>
      )}

      {/* Step 2: Configuration & Quiz Generation */}
      {currentStep === 'configuration' && (
        <View style={styles.form}>
          {/* Website Info */}
          <View style={styles.websiteInfoContainer}>
            <Text style={styles.websiteUrlDisplay}>📄 {websiteUrl}</Text>
          </View>

          {/* Quiz Form Fields */}
          <QuizFormFields
            showClass={true}
            classValue={classValue}
            onClassChange={setClassValue}
            
            showSubject={true}
            subjectValue={subject}
            onSubjectChange={setSubject}
            
            showLesson={true}
            lessonValue={lesson}
            onLessonChange={setLesson}
            lessonPlaceholder="e.g., Website Topic, Article Summary"
            lessonLabel="Lesson/Topic"
            
            showDifficultyLevel={true}
            difficultyValue={level}
            onDifficultyChange={setLevel}
            
            showQuestionCount={true}
            questionCountValue={String(quizQuestionCount)}
            onQuestionCountChange={(text) => setQuizQuestionCount(parseInt(text) || 5)}
            
            additionalInstructionsValue={additionalInstructions}
            onAdditionalInstructionsChange={setAdditionalInstructions}
          />

          {/* Generate Quiz Button */}
          <TouchableOpacity
            style={[styles.generateButton, isGenerating && styles.buttonDisabled]}
            onPress={generateQuiz}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <View style={styles.statusRow}>
                <LoadingSpinner size={20} color="#fff" />
                <Text style={[styles.generateButtonText, { marginLeft: 10 }]}>Generating...</Text>
              </View>
            ) : (
              <Text style={styles.generateButtonText}>🚀 Generate Quiz</Text>
            )}
          </TouchableOpacity>

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentStep('input')}
            disabled={isGenerating}
          >
            <Text style={styles.backButtonText}>← Back to Website Input</Text>
          </TouchableOpacity>
        </View>
      )}
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
  header: {
    padding: 20,
    paddingTop: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
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
  buttonDisabled: {
    opacity: 0.6,
  },
  recentSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.textSecondary,
  },
  summariesList: {
    maxHeight: 200,
  },
  summaryItem: {
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  summaryDate: {
    fontSize: 12,
    color: colors.textSecondary,
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
  websiteInfoContainer: {
    backgroundColor: colors.chipBackground,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  websiteUrlDisplay: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  backButton: {
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});