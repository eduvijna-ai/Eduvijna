import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';
import { generateQuizFromYouTube } from '../core/services/quizzes';
import { apiClient } from '../core/api/config';
import MathRenderer from '../components/MathRenderer';
import QuizFormFields from '../components/QuizFormFields';
import { getClasses, getSubjects, ClassItem, SubjectItem } from '../core/services/dropdown';
import DocumentListPanel from '../components/DocumentListPanel';
import DocumentDetailsPanel from '../components/DocumentDetailsPanel';
import useNotifications from '@core/hooks/useNotifications';

interface YouTubeSummary {
  id: number;
  title: string;
  created_at: string;
  thumbnails?: Array<{
    url: string;
    width: number;
    height: number;
  }>;
}

export default function CreateYouTubeQuizScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isWeb = width > 768;
  const styles = React.useMemo(() => createStyles(theme.colors), [theme.colors]);
  const { refreshAfterQuizGenerated } = useNotifications();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'none' | 'valid' | 'invalid'>('none');
  const [validationMessage, setValidationMessage] = useState('');
  const [recentSummaries, setRecentSummaries] = useState<YouTubeSummary[]>([]);
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(false);
  
  // Two-step flow state
  const [currentStep, setCurrentStep] = useState<'input' | 'analysis'>('input');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoSummary, setVideoSummary] = useState<string | null>(null);
  const [videoTranscript, setVideoTranscript] = useState<string | null>(null);
  
  // Quiz form state
  const [quizQuestionCount, setQuizQuestionCount] = useState(5);
  const [lesson, setLesson] = useState('');
  const [level, setLevel] = useState('basic');
  const [subject, setSubject] = useState('');
  const [classValue, setClassValue] = useState('');
  
  // Dropdown data from API
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [classError, setClassError] = useState('');
  const [subjectError, setSubjectError] = useState('');

  const levels = ['basic', 'intermediate', 'advanced'];

  useEffect(() => {
    loadRecentSummaries();
    loadClasses();
    loadSubjects();
  }, []);

  const handleDocumentSelect = (document: any) => {
    setSelectedDocumentId(document.id);
    setSelectedDocument(document);
  };

  const handleValidateAndAnalyze = async () => {
    if (!youtubeUrl.trim()) {
      Alert.alert('Error', 'Please enter a YouTube URL');
      return;
    }
    // Validate and analyze YouTube video
    setCurrentStep('analysis');
  };

  const loadClasses = async () => {
    setIsLoadingClasses(true);
    setClassError('');
    try {
      const response = await getClasses();
      //console.log('Classes loaded:', response.items.length, 'items');
      setClasses(response.items);
      // Set first class as default if available
      if (response.items.length > 0 && !classValue) {
        console.log('Setting default class:', response.items[0].id);
        setClassValue(response.items[0].id);
      }
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
      // Set first subject as default if available
      if (response.items.length > 0 && !subject) {
        console.log('Setting default subject:', response.items[0].id);
        setSubject(response.items[0].id);
      }
    } catch (error) {
      console.error('Failed to load subjects:', error);
      setSubjectError('Failed to load subjects. Using default values.');
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  const loadRecentSummaries = async () => {
    setIsLoadingSummaries(true);
    try {
      // Fetch recent YouTube summaries from API
      const response = await apiClient.get('/api/v1/ytsummary/recent', {
        params: {
          limit: 10 // Get last 10 summaries
        }
      });
      
      console.log('Recent YouTube summaries loaded:', response.data);
      
      if (response.data && Array.isArray(response.data.summaries)) {
        setRecentSummaries(response.data.summaries);
      } else if (response.data && Array.isArray(response.data)) {
        setRecentSummaries(response.data);
      } else {
        console.log('No recent summaries found');
        setRecentSummaries([]);
      }
    } catch (error: any) {
      console.error('Failed to load recent summaries:', error);
      // If endpoint doesn't exist (404), just show empty list
      if (error.response?.status === 404) {
        console.log('Recent summaries endpoint not available');
      }
      setRecentSummaries([]);
    } finally {
      setIsLoadingSummaries(false);
    }
  };

  const validateYouTubeUrl = (url: string): boolean => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    return youtubeRegex.test(url);
  };

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
      const transcriptResponse = await apiClient.post('/api/v1/ytlink', {
        url: youtubeUrl,
      });
      
      //console.log('Transcript response:', transcriptResponse.data);
      
      if (!transcriptResponse.data || !transcriptResponse.data.transcript) {
        Alert.alert('Error', 'Could not fetch video transcript. Video may not have captions.');
        return;
      }

      setVideoTranscript(transcriptResponse.data.transcript);
      setVideoTitle(transcriptResponse.data.title || 'YouTube Video');

      // Step 2: Get video summary
      const summaryResponse = await apiClient.post('/api/v1/ytsummary', {
        transcript: transcriptResponse.data.transcript,
        url: youtubeUrl,
        title: transcriptResponse.data.title || 'YouTube Video',
      });

      //console.log('Summary response:', summaryResponse.data);

      if (summaryResponse.data && summaryResponse.data.final_summary) {
        setVideoSummary(summaryResponse.data.final_summary.summary_paragraph);
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

  const generateQuiz = async () => {
    if (!classValue || !subject || !lesson) {
      Alert.alert('Error', 'Please fill in Class, Subject, and Lesson fields');
      return;
    }

    setIsGenerating(true);

    try {
      let finalPrompt = '';

      if (videoSummary) {
        finalPrompt += videoSummary;
      }

      if (additionalInstructions.trim()) {
        if (finalPrompt) {
          finalPrompt += '\n\n';
        }
        finalPrompt += `Additional instructions: ${additionalInstructions.trim()}`;
      }

      if (!finalPrompt) {
        finalPrompt = 'Generate assessment questions based on the video content.';
      }

      Alert.alert('Feature Coming Soon', 'assessment generation from YouTube videos will be available soon. For now, you can view the video summary.');
      
    } catch (error: unknown) {
      console.error('assessment generation error:', error);
      const errorMsg = (error as any)?.response?.data?.detail || (error as any)?.message || 'Failed to Generate assessment from video';
      Alert.alert('Error', errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectRecentSummary = async (summary: YouTubeSummary) => {
    Alert.alert(
      'Use Recent Video',
      `Generate assessment from "${summary.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Generate assessment',
          onPress: async () => {
            // Refresh notifications
            await refreshAfterQuizGenerated();
            
            // Mock generating assessment from existing summary
            navigation.navigate('QuizTaking', {
              quizData: {
                title: summary.title,
                questions: [] // Would be populated from the summary
              },
              showShareButton: true,
              showActionButtons: true,
            });
          }
        }
      ]
    );
  };

  const renderRecentSummary = ({ item }: { item: YouTubeSummary }) => (
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
      {isWeb && currentStep === 'input' ? (
        // Web 3-Panel Layout
        <View style={styles.threePanelLayout}>
          <DocumentListPanel
            selectedDocumentId={selectedDocumentId}
            onDocumentSelect={handleDocumentSelect}
          />
          
          <View style={styles.centerPanel}>
            

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>📺 YouTube Assessment</Text>
          <Text style={styles.subtitle}>
            {currentStep === 'input' 
              ? 'Generate assessment from YouTube video' 
              : 'Configure your assessment'}
          </Text>
        </View>

      {/* Step 1: Input YouTube URL */}
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
            />
            <Text style={styles.hint}>Paste the link to the YouTube video</Text>
          </View>

          <TouchableOpacity
            style={[styles.generateButton, isLoadingVideo && styles.buttonDisabled]}
            onPress={analyzeVideo}
            disabled={isLoadingVideo}
          >
            {isLoadingVideo ? (
              <ActivityIndicator size={20} color={theme.colors.primary} />
            ) : (
              <Text style={styles.generateButtonText}>🔍 Analyze Video</Text>
            )}
          </TouchableOpacity>

          {/* Recent Summaries Section */}
          {recentSummaries.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.sectionTitle}>📋 Recent YouTube Summaries</Text>
              <Text style={styles.sectionSubtitle}>Or Generate assessment from a recent video</Text>
              
              {isLoadingSummaries ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size={30} color={theme.colors.primary} />
                  <Text style={styles.loadingText}>Loading recent summaries...</Text>
                </View>
              ) : (
                <FlatList
                  data={recentSummaries}
                  renderItem={renderRecentSummary}
                  keyExtractor={(item: any) => item.id.toString()}
                  style={styles.summariesList}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
          )}

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>💡 How it works:</Text>
            <Text style={styles.infoText}>• Validates video has transcripts/subtitles</Text>
            <Text style={styles.infoText}>• AI analyzes the video content</Text>
            <Text style={styles.infoText}>• Extracts key concepts and topics</Text>
            <Text style={styles.infoText}>• Creates targeted questions based on the content</Text>
          </View>
        </View>
      )}
          </ScrollView>
          </View>
          
          <DocumentDetailsPanel selectedDocument={selectedDocument} />
        </View>
      ) : (
        // Mobile or Analysis View - Original Layout
        <>
          {/* Header with Close Button */}
          <View style={styles.headerBar}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create YouTube Assessment</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="logo-youtube" size={48} color="#DC2626" />
          </View>
          <Text style={styles.title}>YouTube Assessment Generator</Text>
          <Text style={styles.subtitle}>
            {currentStep === 'input' 
              ? 'Generate assessment from YouTube video' 
              : 'Configure your assessment'}
          </Text>
        </View>

      {/* Step 1: Input YouTube URL */}
      {currentStep === 'input' && (
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>YouTube URL *</Text>
            <TextInput
              style={styles.input}
              value={youtubeUrl}
              onChangeText={setYoutubeUrl}
              placeholder="https://www.youtube.com/watch?v=..."
              placeholderTextColor={theme.colors.placeholder}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          {/* Validation Status */}
          {validationMessage && (
            <View style={styles.validationContainer}>
              <Text style={[
                styles.validationText, 
                { color: validationStatus === 'valid' ? theme.colors.success : theme.colors.error }
              ]}>
                {validationMessage}
              </Text>
            </View>
          )}

          {/* Validate Button */}
          <TouchableOpacity
            style={[styles.validateButton, (isValidating) && styles.buttonDisabled]}
            onPress={handleValidateAndAnalyze}
            disabled={isValidating}
          >
            {isValidating ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={styles.validateButtonText}>
                {isValidating ? 'Validating...' : '✨ Analyze Video'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Recent Summaries Section */}
          {recentSummaries.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.sectionTitle}>📋 Recent YouTube Summaries</Text>
              <Text style={styles.sectionSubtitle}>Or Generate assessment from a recent video</Text>
              
              {isLoadingSummaries ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>Loading recent summaries...</Text>
                </View>
              ) : (
                <FlatList
                  data={recentSummaries}
                  renderItem={renderRecentSummary}
                  keyExtractor={(item: any) => item.id.toString()}
                  style={styles.summariesList}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
          )}

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>💡 How it works:</Text>
            <Text style={styles.infoText}>• Paste a YouTube video URL</Text>
            <Text style={styles.infoText}>• Validates video has transcripts/subtitles</Text>
            <Text style={styles.infoText}>• AI analyzes the video content</Text>
            <Text style={styles.infoText}>• Extracts key concepts and topics</Text>
            <Text style={styles.infoText}>• Creates targeted questions based on the content</Text>
          </View>
        </View>
      )}

      {/* Step 2: Analysis & Assessment Configuration */}
      {currentStep === 'analysis' && videoSummary && (
        <View style={styles.form}>
          {/* Video Info */}
          <View style={styles.videoInfoContainer}>
            <Text style={styles.videoTitle}>{videoTitle}</Text>
            <View style={styles.summaryPreview}>
              <Text style={styles.summaryLabel}>Video Summary:</Text>
              <MathRenderer text={videoSummary} colors={theme.colors} />
            </View>
            {/* <TouchableOpacity
              style={styles.viewFullButton}
              onPress={() => setShowAnalysisModal(true)}
            >
              <Text style={styles.viewFullButtonText}>📊 View Topic Summary</Text>
            </TouchableOpacity> */}
          </View>

          {/* Quiz Form Fields */}
          <QuizFormFields
            showClass={true}
            classValue={classValue}
            onClassChange={setClassValue}
            classes={classes}
            isLoadingClasses={isLoadingClasses}
            classError={classError}
            
            showSubject={true}
            subjectValue={subject}
            onSubjectChange={setSubject}
            subjects={subjects}
            isLoadingSubjects={isLoadingSubjects}
            subjectError={subjectError}
            
            showLesson={true}
            lessonValue={lesson}
            onLessonChange={setLesson}
            lessonPlaceholder="e.g., JavaScript Basics, React Hooks"
            lessonLabel="Lesson/Topic"
            
            showDifficultyLevel={true}
            difficultyValue={level}
            onDifficultyChange={setLevel}
            difficultyLevels={levels.map(l => ({ id: l, name: l.charAt(0).toUpperCase() + l.slice(1) }))}
            
            showQuestionCount={true}
            questionCountValue={String(quizQuestionCount)}
            onQuestionCountChange={(text) => setQuizQuestionCount(parseInt(text) || 5)}
            
            additionalInstructionsValue={additionalInstructions}
            onAdditionalInstructionsChange={setAdditionalInstructions}
          />

          {/* Generate assessment Button */}
          <TouchableOpacity
            style={[styles.generateButton, isGenerating && styles.buttonDisabled]}
            onPress={generateQuiz}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator size={20} color={theme.colors.primary} />
            ) : (
              <Text style={styles.generateButtonText}>🚀 Generate assessment</Text>
            )}
          </TouchableOpacity>

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentStep('input')}
            disabled={isGenerating}
          >
            <Text style={styles.backButtonText}>← Back to Video Input</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Topic Analysis Modal */}
      {/* {videoSummary && (
        <TopicAnalysisModal
          visible={showAnalysisModal}
          onClose={() => setShowAnalysisModal(false)}
          initialLesson={lesson}
          className={classes.find(c => c.id === classValue)?.name || classValue}
          subject={subjects.find(s => s.id === subject)?.name || subject}
          difficulty={level}
          additionalInstructions={videoSummary}
        />
      )} */}
      </ScrollView>
        </>
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
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
  videoInfoContainer: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  summaryPreview: {
    backgroundColor: colors.inputBackground,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  viewFullButton: {
    backgroundColor: colors.chipBackground,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewFullButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: colors.inputBackground,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  backButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  validateButton: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  validateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  validationContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  validationText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
