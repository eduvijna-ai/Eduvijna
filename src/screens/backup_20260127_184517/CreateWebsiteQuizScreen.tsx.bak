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
import { generateQuizFromWebsite } from '../core/services/quizzes';
import DocumentListPanel from '../components/DocumentListPanel';
import DocumentDetailsPanel from '../components/DocumentDetailsPanel';
import useNotifications from '@core/hooks/useNotifications';

interface WebsiteSummary {
  id: number;
  title: string;
  created_at: string;
  url?: string;
}

export default function CreateWebsiteQuizScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isWeb = width > 768;
  const styles = React.useMemo(() => createStyles(theme.colors), [theme.colors]);
  const { refreshAfterQuizGenerated } = useNotifications();
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'none' | 'valid' | 'invalid'>('none');
  const [validationMessage, setValidationMessage] = useState('');
  const [recentSummaries, setRecentSummaries] = useState<WebsiteSummary[]>([]);
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(false);

  useEffect(() => {
    loadRecentSummaries();
  }, []);

  const handleDocumentSelect = (document: any) => {
    setSelectedDocumentId(document.id);
    setSelectedDocument(document);
  };

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

    if (!additionalInstructions.trim()) {
      Alert.alert('Error', 'Please enter additional instructions');
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
      setValidationMessage('✅ Website validated! Proceeding to Generate assessment...');
      setIsValidating(false);

      // Step 2: Generate assessment
      setTimeout(() => {
        generateQuiz();
      }, 1000);

    } catch (error) {
      setValidationStatus('invalid');
      setValidationMessage('❌ Unable to access this website or extract content. Please try a different URL.');
      setIsValidating(false);
    }
  };

  const generateQuiz = async () => {
    setIsGenerating(true);
    
    try {
      const result = await generateQuizFromWebsite(websiteUrl, 'middle_school');
      
      // Refresh notifications after quiz creation
      await refreshAfterQuizGenerated();
      
      // Navigate to quiz taking screen with the Generated Assessment
      navigation.navigate('QuizTaking', {
        quizData: {
          id: result.quiz_id || 'website-quiz',
          title: result.title || 'Website Assessment',
          questions: result.quiz || [],
          difficulty: 'intermediate',
          lesson: result.title || 'Website Topic',
          additional_instructions: '',
          thread_id: result.thread_id,
          thread_slug: result.thread_slug,
          regenerationParams: {
            type: 'website',
            weblink: websiteUrl,
            student_level: 'middle_school',
          },
        },
        showShareButton: true,
        showActionButtons: true,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to Generate assessment from website');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectRecentSummary = (summary: WebsiteSummary) => {
    Alert.alert(
      'Use Recent Website',
      `Generate assessment from "${summary.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Generate assessment',
          onPress: () => {
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
      {isWeb ? (
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
          <View style={styles.iconContainer}>
            <Ionicons name="globe-outline" size={48} color="#0284C7" />
          </View>
          <Text style={styles.title}>Website Assessment Generator</Text>
          <Text style={styles.subtitle}>Generate assessment from website content</Text>
        </View>

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
          <Text style={styles.label}>Additional Instructions *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g., Focus on key concepts from the video, create questions about..."
            placeholderTextColor="#999999"
            multiline
            numberOfLines={4}
            value={additionalInstructions}
            onChangeText={setAdditionalInstructions}
          />
          <Text style={styles.hint}>Provide specific instructions for the assessment generation</Text>
        </View>

        {/* Validation Status */}
        {(isValidating || validationStatus !== 'none') && (
          <View style={styles.statusContainer}>
            {isValidating && (
              <View style={styles.statusRow}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.statusText}>Validating video...</Text>
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

        {/* Generation Status */}
        {isGenerating && (
          <View style={styles.statusContainer}>
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.statusText}>Generating Assessment...</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.generateButton,
            (isValidating || isGenerating) && styles.buttonDisabled
          ]}
          onPress={handleValidateAndGenerate}
          disabled={isValidating || isGenerating}
        >
          <Text style={styles.generateButtonText}>
            {isValidating ? 'Validating...' : isGenerating ? 'Generating...' : '🚀 Validate & Generate assessment'}
          </Text>
        </TouchableOpacity>

        {/* Recent Summaries Section */}
        {recentSummaries.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>📋 Recent Website Summaries</Text>
            <Text style={styles.sectionSubtitle}>Or Generate assessment from a recent website</Text>
            
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
          <Text style={styles.infoText}>• Extracts text content from web pages</Text>
          <Text style={styles.infoText}>• Analyzes articles, documentation, and educational content</Text>
          <Text style={styles.infoText}>• Creates comprehensive questions based on the content</Text>
          <Text style={styles.infoText}>• Works with blogs, articles, tutorials, and reference materials</Text>
        </View>
      </View>
      </ScrollView>
          </View>
          
          <DocumentDetailsPanel selectedDocument={selectedDocument} />
        </View>
      ) : (
        // Mobile Layout
        <>
          {/* Header with Close Button */}
          <View style={styles.headerBar}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Website Assessment</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>🌐 Website Assessment</Text>
          <Text style={styles.subtitle}>Generate assessment from website content</Text>
        </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Website URL *</Text>
          <TextInput
            style={styles.input}
            value={websiteUrl}
            onChangeText={setWebsiteUrl}
            placeholder="https://example.com/article"
            placeholderTextColor={theme.colors.placeholder}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        {/* Additional Instructions Field */}
        <View style={styles.field}>
          <Text style={styles.label}>Additional Instructions (Optional)</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={3}
            value={additionalInstructions}
            onChangeText={setAdditionalInstructions}
            placeholder="e.g., Focus on the main concepts, or describe specific questions you want"
            placeholderTextColor={theme.colors.placeholder}
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

        {/* Generate Button */}
        <TouchableOpacity
          style={[styles.generateButton, (isValidating || isGenerating) && styles.buttonDisabled]}
          onPress={handleValidateAndGenerate}
          disabled={isValidating || isGenerating}
        >
          <Text style={styles.generateButtonText}>
            {isValidating ? 'Validating...' : isGenerating ? 'Generating...' : '✨ Analyze Website'}
          </Text>
        </TouchableOpacity>

        {/* Recent Summaries Section */}
        {recentSummaries.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>📋 Recent Website Summaries</Text>
            <Text style={styles.sectionSubtitle}>Or Generate assessment from a recent website</Text>
            
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
          <Text style={styles.infoText}>• Extracts text content from web pages</Text>
          <Text style={styles.infoText}>• Analyzes articles, documentation, and educational content</Text>
          <Text style={styles.infoText}>• Creates comprehensive questions based on the content</Text>
          <Text style={styles.infoText}>• Works with blogs, articles, tutorials, and reference materials</Text>
        </View>
      </View>
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
    backgroundColor: '#E0F2FE',
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
