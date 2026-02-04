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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { generateAIQuiz } from '../core/services/sharedApi';
import QuizFormFields from '../components/QuizFormFields';
import { useDropdowns } from '../context/DropdownContext';
import { apiClient } from '../core/api/config';
import MathRenderer from '../components/MathRenderer';
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
  const { refreshAfterQuizGenerated } = useNotifications();
  const { classes, subjects } = useDropdowns();
  const styles = React.useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [recentSummaries, setRecentSummaries] = useState<YouTubeSummary[]>([]);
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(false);
  
  // Two-step flow state
  const [currentStep, setCurrentStep] = useState<'input' | 'analysis'>('input');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoSummary, setVideoSummary] = useState<string | null>(null);
  
  // Quiz form state
  const [quizQuestionCount, setQuizQuestionCount] = useState(5);
  const [lesson, setLesson] = useState('');
  const [level, setLevel] = useState('basic');
  const [subject, setSubject] = useState('');
  const [classValue, setClassValue] = useState('');

  useEffect(() => {
    loadRecentSummaries();
  }, []);

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
        finalPrompt = 'Generate quiz questions based on the video content.';
      }

      const result = await generateAIQuiz({
        class: classValue,
        subject: subject,
        lesson: lesson,
        level: level,
        count: quizQuestionCount,
        itext: finalPrompt,
      });

      console.log('Quiz generated:', result);

      await refreshAfterQuizGenerated();
      
      navigation.navigate('QuizTakingScreen', {
        quizData: {
          id: result.quiz_id,
          title: `${lesson} Quiz`,
          questions: result.quiz || [],
          class: classes.find((c) => c.id === classValue)?.name,
          subject: subjects.find((s) => s.id === subject)?.name,
          difficulty: level,
          lesson: lesson,
          additional_instructions: finalPrompt || '',
          thread_id: result.thread_id,
          thread_slug: result.thread_slug,
          reused_thread: result.reused_thread,
          regenerationParams: {
            type: 'youtube',
            url: youtubeUrl,
            studentLevel: level === 'basic' ? 'elementary' : level === 'intermediate' ? 'middle_school' : 'pre_medical',
            classId: classValue,
            subjectId: subject,
            count: quizQuestionCount,
            itext: finalPrompt,
          },
        },
        showShareButton: true,
        showActionButtons: true,
        onNewQuiz: () => {
          navigation.goBack();
        },
      });
    } catch (error: unknown) {
      console.error('Quiz generation error:', error);
      const errorMsg = (error as any)?.response?.data?.detail || (error as any)?.message || 'Failed to generate quiz from video';
      Alert.alert('Error', errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectRecentSummary = (summary: YouTubeSummary) => {
    Alert.alert(
      'Use Recent Video',
      `Generate quiz from "${summary.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Generate Quiz',
          onPress: () => {
            // Mock generating quiz from existing summary
            navigation.navigate('QuizTakingScreen', {
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
      {/* Header with Close Button */}
      {/* <View style={styles.headerBar}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create YouTube Quiz</Text>
        <View style={styles.headerPlaceholder} />
      </View> */}

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>📺 YouTube Quiz</Text>
          <Text style={styles.subtitle}>
            {currentStep === 'input' 
              ? 'Generate quiz from YouTube video' 
              : 'Configure your quiz'}
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
              <LoadingSpinner size={20} />
            ) : (
              <Text style={styles.generateButtonText}>🔍 Analyze Video</Text>
            )}
          </TouchableOpacity>

          {/* Recent Summaries Section */}
          {recentSummaries.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.sectionTitle}>📋 Recent YouTube Summaries</Text>
              <Text style={styles.sectionSubtitle}>Or generate quiz from a recent video</Text>
              
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
            <Text style={styles.infoText}>• Validates video has transcripts/subtitles</Text>
            <Text style={styles.infoText}>• AI analyzes the video content</Text>
            <Text style={styles.infoText}>• Extracts key concepts and topics</Text>
            <Text style={styles.infoText}>• Creates targeted questions based on the content</Text>
          </View>
        </View>
      )}

      {/* Step 2: Analysis & Quiz Configuration */}
      {currentStep === 'analysis' && (
        <View style={styles.form}>
          {/* Video Info */}
          <View style={styles.videoInfoContainer}>
            {videoTitle && <Text style={styles.videoTitle}>{videoTitle}</Text>}
            {videoSummary && (
              <View style={styles.summaryPreview}>
                <Text style={styles.summaryLabel}>Video Summary:</Text>
                <MathRenderer text={videoSummary} colors={theme.colors} />
              </View>
            )}
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
            lessonPlaceholder="e.g., JavaScript Basics, React Hooks"
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
              <LoadingSpinner size={20} />
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
});

