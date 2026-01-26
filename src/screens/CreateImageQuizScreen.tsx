import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@context/ThemeContext';
import { generateQuizFromImage } from '../core/services/quizzes';
import { getClasses, getSubjects, ClassItem, SubjectItem } from '../core/services/dropdown';
import QuizFormFields from '../components/QuizFormFields';
import MathRenderer from '../components/MathRenderer';
import DocumentListPanel from '../components/DocumentListPanel';
import DocumentDetailsPanel from '../components/DocumentDetailsPanel';
import useNotifications from '@core/hooks/useNotifications';

export default function CreateImageQuizScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isWeb = width > 768;
  const styles = React.useMemo(() => createStyles(theme.colors), [theme.colors]);
  const { refreshAfterQuizGenerated } = useNotifications();
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'none' | 'valid' | 'invalid'>('none');
  const [validationMessage, setValidationMessage] = useState('');
  const [currentStep, setCurrentStep] = useState<'upload' | 'analysis'>('upload');
  const [imagePreviewUri, setImagePreviewUri] = useState<string | null>(null);

  // Analysis state (mirrors web ImageAnalysisResponse)
  const [imageAnalysis, setImageAnalysis] = useState<any | null>(null);
  const [quizQuestionCount, setQuizQuestionCount] = useState<number>(5);
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
    requestPermissions();
    loadClasses();
    loadSubjects();
  }, []);

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

  const handleDocumentSelect = (document: any) => {
    setSelectedDocumentId(document.id);
    setSelectedDocument(document);
  };

  const requestPermissions = async () => {
    const media = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (media.status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library');
    }

    // Request camera permissions as well (for take photo)
    const camera = await ImagePicker.requestCameraPermissionsAsync();
    if (camera.status !== 'granted') {
      // Not fatal — user can still pick from gallery
      console.warn('Camera permission not granted');
    }
  };

  // Commented out - not currently used
  /*
  const loadRecentSummaries = async () => {
    setIsLoadingSummaries(true);
    try {
      // Mock data for now - replace with actual API call
      const mockData: ImageSummary[] = [
        {
          id: 1,
          title: "Math Problem Set A",
          created_at: new Date().toISOString(),
          image_url: undefined
        },
        {
          id: 2,
          title: "Science Diagram Analysis",
          created_at: new Date().toISOString(),
          image_url: undefined
        }
      ];
      setRecentSummaries(mockData);
    } catch (error) {
      console.error('Failed to load recent summaries:', error);
    } finally {
      setIsLoadingSummaries(false);
    }
  };
  */

  const pickImage = async () => {
    const permissionResult = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!permissionResult || permissionResult.status !== 'granted') {
      const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!req.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0]);
      setImagePreviewUri(result.assets[0].uri);
    }
  };

  const pickFromCamera = async () => {
    const permission = await ImagePicker.getCameraPermissionsAsync();
    if (!permission || permission.status !== 'granted') {
      const req = await ImagePicker.requestCameraPermissionsAsync();
      if (!req.granted) {
        Alert.alert('Permission Required', 'Please allow camera access to take a photo');
        return;
      }
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0]);
      setImagePreviewUri(result.assets[0].uri);
    }
  };

  const handleValidateAndGenerate = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image');
      return;
    }

    // if (!additionalInstructions.trim()) {
    //   Alert.alert('Error', 'Please enter additional instructions');
    //   return;
    // }

    // Step 1: Validate image
    setIsValidating(true);
    setValidationStatus('none');
    setValidationMessage('');

    try {
      console.log('Analyzing image with instructions:', additionalInstructions);
      

      console.log('Uploading image for analysis...');

      // Call the analyze-image API endpoint
      const response = await generateQuizFromImage(
        selectedImage.uri,
        'advance', // studentLevel
        additionalInstructions.trim() // additionalInstructions
      );
      
      console.log('Image analysis response:', response);

      // The API returns a full response with assessment, summary, etc.
      // Extract the analysis information
      const analysisData = {
        summary: response?.summary || response?.message || 'Image analyzed successfully.',
        subject: response?.subject || subject,
        topic: response?.topic || lesson,
        keywords: response?.tags || response?.keywords || [],
        elements: response?.elements || [],
        raw_response: response, // Store full response for debugging
      };

      console.log('Image analysis complete:', analysisData);

      setImageAnalysis(analysisData);
      setValidationStatus('valid');
      setValidationMessage('✅ Image analyzed successfully!');
      setIsValidating(false);

      // Move to analysis step
      setTimeout(() => setCurrentStep('analysis'), 350);

    } catch (error: any) {
      console.error('Image validation error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      const errorMessage = error.response?.data?.detail || 
                          error.message || 
                          'Unable to process this image. Please try a different image.';
      
      setValidationStatus('invalid');
      setValidationMessage(`❌ ${errorMessage}`);
      setIsValidating(false);
      
      Alert.alert('Error', errorMessage);
    }
  };

  const generateQuiz = async () => {
    if (!classValue || !subject || !lesson) {
      Alert.alert('Error', 'Please fill in Class, Subject, and Lesson fields');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Prepare the prompt by combining image analysis summary with additional instructions
      let finalPrompt = '';
      
      // Add summary from image analysis
      if (imageAnalysis?.summary) {
        finalPrompt += imageAnalysis.summary;
      }
      
      // Add additional instructions
      if (additionalInstructions.trim()) {
        // Add separator if summary exists
        if (finalPrompt) {
          finalPrompt += '\n\n';
        }
        finalPrompt += `Additional instructions: ${additionalInstructions.trim()}`;
      }
      
      // If no content, use a default message
      if (!finalPrompt) {
        finalPrompt = 'Generate assessment questions based on the uploaded image content.';
      }

      // Call the assessment generation API
      // For now, we'll just use the image analysis result
      // In a full implementation, you would call generateQuizFromImage here
      console.log('assessment generation requested with:', {
        class: classValue,
        subject: subject,
        lesson: lesson,
        level: level,
        count: quizQuestionCount,
        prompt: finalPrompt,
      });
      
      Alert.alert('Feature Coming Soon', 'assessment generation from images will be available soon. For now, you can view the image analysis.');
      
    } catch (error: any) {
      console.error('assessment generation error:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to Generate assessment from image';
      Alert.alert('Error', errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBackToUpload = () => {
    setCurrentStep('upload');
    // keep selectedImage so user can re-edit instructions
  };

  // Commented out - not currently used
  /*
  const handleSelectRecentSummary = (summary: ImageSummary) => {
    Alert.alert(
      'Use Recent Image',
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

  const renderRecentSummary = ({ item }: { item: ImageSummary }) => (
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
  */

  return (
    <View style={styles.container}>
      {isWeb && currentStep === 'upload' ? (
        // Web 3-Panel Layout
        <View style={styles.threePanelLayout}>
          <DocumentListPanel
            selectedDocumentId={selectedDocumentId}
            onDocumentSelect={handleDocumentSelect}
          />
          
          <View style={styles.centerPanel}>
        
      <ScrollView showsVerticalScrollIndicator={false}>
        {currentStep === 'upload' && (
          <>
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="image" size={48} color="#7C3AED" />
              </View>
              <View style={styles.iconConer}>ent Geraor
                <Ionicons name="image" size={48} color="#7C3AED" />
              </View>
              <Text style={styles.title}>Image Assessment Generator</Text>
              <Text style={styles.subtitle}>Generate assessment from an image</Text>
            </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Upload Image *</Text>
              
              {selectedImage ? (
                <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                  <Image source={{ uri: imagePreviewUri || selectedImage.uri }} style={styles.selectedImage} />
                </TouchableOpacity>
              ) : (
                <View style={styles.imagePickerPlaceholder}>
                  <Text style={styles.imagePickerIcon}>📷</Text>
                  <Text style={styles.imagePickerText}>No image selected</Text>
                  <Text style={styles.imagePickerSubtext}>Choose an option below</Text>
                </View>
              )}

              {/* Image picker buttons */}
              <View style={styles.imageButtonsRow}>
                <TouchableOpacity 
                  style={[styles.imageButton, styles.galleryButton]} 
                  onPress={pickImage}
                >
                  <Text style={styles.imageButtonIcon}>🖼️</Text>
                  <Text style={[styles.imageButtonText, { color: '#7C3AED' }]}>Choose from Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.imageButton, styles.cameraButton]} 
                  onPress={pickFromCamera}
                >
                  <Text style={styles.imageButtonIcon}>📸</Text>
                  <Text style={[styles.imageButtonText, { color: '#fff' }]}>Take Photo</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.hint}>Select an image containing text, diagrams, or educational content</Text>
            </View>

            {/* Validation Status */}
            {(isValidating || validationStatus !== 'none') && (
              <View style={styles.statusContainer}>
                {isValidating && (
                  <View style={styles.statusRow}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={styles.statusText}>Validating image...</Text>
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
                  <Text style={styles.statusText}>Generating assessment...</Text>
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
                {isValidating ? 'Validating...' : isGenerating ? 'Generating...' : '� Analyze Image'}
              </Text>
            </TouchableOpacity>

            {/* Recent Summaries Section
            {recentSummaries.length > 0 && (
              <View style={styles.recentSection}>
                <Text style={styles.sectionTitle}>📋 Recent Image Summaries</Text>
                <Text style={styles.sectionSubtitle}>Or Generate assessment from a recent image</Text>
                
                {isLoadingSummaries ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
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
              <Text style={styles.infoText}>• Analyzes text and visual content in the image</Text>
              <Text style={styles.infoText}>• Extracts key concepts and information</Text>
              <Text style={styles.infoText}>• Creates targeted questions based on the content</Text>
              <Text style={styles.infoText}>• Works with diagrams, charts, text, and educational materials</Text>
            </View> */}
          </View>
        </>
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
        <Text style={styles.headerTitle}>Create Image Assessment</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {currentStep === 'upload' && (
          <>
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="image" size={48} color="#7C3AED" />
              </View>
              <Text style={styles.title}>Image Assessment Generator</Text>
              <Text style={styles.subtitle}>Generate assessment from an image</Text>
            </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Upload Image *</Text>
              
              {selectedImage ? (
                <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                  <Image source={{ uri: imagePreviewUri || selectedImage.uri }} style={styles.selectedImage} />
                </TouchableOpacity>
              ) : (
                <View style={styles.imagePickerPlaceholder}>
                  <Text style={styles.imagePickerIcon}>📷</Text>
                  <Text style={styles.imagePickerText}>No image selected</Text>
                  <Text style={styles.imagePickerSubtext}>Choose an option below</Text>
                </View>
              )}

              {/* Image picker buttons */}
              <View style={styles.imageButtonsRow}>
                <TouchableOpacity 
                  style={[styles.imageButton, styles.galleryButton]} 
                  onPress={pickImage}
                >
                  <Text style={styles.imageButtonIcon}>🖼️</Text>
                  <Text style={[styles.imageButtonText, { color: '#7C3AED' }]}>Choose from Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.imageButton, styles.cameraButton]} 
                  onPress={pickFromCamera}
                >
                  <Text style={styles.imageButtonIcon}>📸</Text>
                  <Text style={[styles.imageButtonText, { color: '#fff' }]}>Take Photo</Text>
                </TouchableOpacity>
              </View>

              {selectedImage && (
                <TouchableOpacity 
                  style={styles.changeImageButton} 
                  onPress={() => setSelectedImage(null)}
                >
                  <Text style={styles.changeImageButtonText}>🗑️ Remove Image</Text>
                </TouchableOpacity>
              )}
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
                placeholder="e.g., Focus on the mathematical concepts shown, or describe specific questions you want"
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
                {isValidating ? 'Validating...' : isGenerating ? 'Generating...' : '✨ Analyze Image'}
              </Text>
            </TouchableOpacity>

            {/* Recent Summaries Section
            {recentSummaries.length > 0 && (
              <View style={styles.recentSection}>
                <Text style={styles.sectionTitle}>📋 Recent Image Summaries</Text>
                <Text style={styles.sectionSubtitle}>Or Generate assessment from a recent image</Text>
                
                {isLoadingSummaries ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
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
            )} */}

            {/* Info Section */}
            {/* <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>💡 How it works:</Text>
              <Text style={styles.infoText}>• Upload any educational image (diagrams, charts, text)</Text>
              <Text style={styles.infoText}>• AI analyzes and extracts key information</Text>
              <Text style={styles.infoText}>• Generates assessment questions based on content</Text>
              <Text style={styles.infoText}>• Extracts key concepts and information</Text>
              <Text style={styles.infoText}>• Creates targeted questions based on the content</Text>
              <Text style={styles.infoText}>• Works with diagrams, charts, text, and educational materials</Text>
            </View> */}
          </View>
        </>
      )}

      {currentStep === 'analysis' && imageAnalysis && (
        <View style={styles.form}>
          <View style={styles.analysisHeader}>
            <View>
              <Text style={styles.analysisTitle}>🖼️ Image Analysis</Text>
              <Text style={styles.subtitle}>Review the detected content and set assessment parameters</Text>
            </View>
            <TouchableOpacity onPress={handleBackToUpload} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>

          {imagePreviewUri && (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imagePreviewUri as string }} style={styles.imagePreview} />
            </View>
          )}

          <View style={styles.analysisSection}>
            <Text style={styles.analysisSectionTitle}>Summary</Text>
            <MathRenderer text={imageAnalysis.summary} colors={theme.colors} />
          </View>

          {imageAnalysis.keywords && Array.isArray(imageAnalysis.keywords) && imageAnalysis.keywords.length > 0 && (
            <View style={styles.analysisSection}>
              <Text style={styles.analysisSectionTitle}>Keywords</Text>
              <Text style={styles.sectionText}>{imageAnalysis.keywords.join(' | ')}</Text>
            </View>
          )}

          {imageAnalysis.elements && Array.isArray(imageAnalysis.elements) && imageAnalysis.elements.length > 0 && (
            <View style={styles.analysisSection}>
              <Text style={styles.analysisSectionTitle}>Detected Elements</Text>
              {imageAnalysis.elements.map((el: any, idx: number) => (
                <View key={idx} style={styles.elementCard}>
                  <Text style={styles.elementLabel}>{el.label || el.name || 'Element'}</Text>
                  <Text style={styles.elementDescription}>{el.description || el.value || ''}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Quiz Form Fields using QuizFormFields component */}
          <View style={styles.quizConfigSection}>
            <Text style={styles.configLabel}>📝 Assessment Configuration</Text>
            
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
              lessonPlaceholder="e.g., Photosynthesis, Cell Division"
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
          </View>

          {/* Action Buttons */}
          <View style={{ marginTop: 20, gap: 12 }}>
            {/* Topic Summary Button */}
            {/* <TouchableOpacity 
              style={styles.analyzeButton}
              onPress={() => setShowAnalysisModal(true)}
            >
              <Text style={styles.analyzeButtonText}>📊 Topic Summary</Text>
            </TouchableOpacity> */}

            {/* Generate assessment Button */}
            <TouchableOpacity 
              onPress={generateQuiz} 
              style={[styles.generateButton, isGenerating && styles.buttonDisabled]}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text style={styles.generateButtonText}>🧠 Generate {quizQuestionCount} Questions</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}


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
  analyzeButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  analyzeButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
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
  imagePicker: {
    backgroundColor: colors.inputBackground,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerContent: {
    alignItems: 'center',
  },
  imagePickerIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  imagePickerText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  imagePickerSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  imagePickerPlaceholder: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  imageButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  galleryButton: {
    backgroundColor: colors.card,
    borderColor: colors.primary,
  },
  cameraButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  imageButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  imageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  analysisHeader: {
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  analysisTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: colors.textSecondary,
  },
  imagePreviewContainer: {
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  analysisSection: {
    marginBottom: 16,
  },
  analysisSectionTitle: {
    fontWeight: '700',
    marginBottom: 8,
    color: colors.text,
  },
  sectionText: {
    color: colors.text,
  },
  elementCard: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: colors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  elementLabel: {
    fontWeight: '600',
    color: colors.text,
  },
  elementDescription: {
    color: colors.textSecondary,
  },
  quizConfigSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  configLabel: {
    fontSize: 16,
    marginBottom: 12,
    fontWeight: '600',
    color: colors.text,
  },
  changeImageButton: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.error + '15',
    borderRadius: 8,
    alignItems: 'center',
  },
  changeImageButtonText: {
    color: colors.error,
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
