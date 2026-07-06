import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Formik, type FormikHelpers, type FormikProps } from 'formik';
import * as Yup from 'yup';
import { Ionicons } from '@expo/vector-icons';
import LoadingSpinner from '../components/LoadingSpinner';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@context/ThemeContext';
import { generateQuizFromImage } from '../core/services/quizzes';
import { generateAIQuiz } from '../core/services/sharedApi';
import QuizFormFields from '../components/QuizFormFields';
import { useDropdowns } from '../context/DropdownContext';
import MathRenderer from '../components/MathRenderer';
import useNotifications from '@core/hooks/useNotifications';
import { sanitizeQuizQuestions } from '@core/utils/quizQuestionUtils';

export default function CreateImageQuizScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { refreshAfterQuizGenerated } = useNotifications();
  const { classes, subjects } = useDropdowns();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'none' | 'valid' | 'invalid'>('none');
  const [validationMessage, setValidationMessage] = useState('');
  const [currentStep, setCurrentStep] = useState<'upload' | 'analysis' | 'assessment'>('upload');
  const [imagePreviewUri, setImagePreviewUri] = useState<string | null>(null);

  // Analysis state (mirrors web ImageAnalysisResponse)
  const [imageAnalysis, setImageAnalysis] = useState<any | null>(null);
  const [quizQuestionCount, setQuizQuestionCount] = useState<number>(5);
  const [lesson, setLesson] = useState('');
  const [level, setLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [classValue, setClassValue] = useState('');

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
  const [assessmentStep, setAssessmentStep] = useState<'analysis' | 'assessment'>('analysis');

  const validationSchema = Yup.object({
    class: Yup.string().required('Class is required'),
    subject: Yup.string().required('Subject is required'),
    lesson: Yup.string().required('Lesson/Topic is required'),
    level: Yup.string().required('Difficulty level is required'),
    itext: Yup.string().trim().required('Additional instructions are required'),
  });

  useEffect(() => {
    requestPermissions();
  }, []);

  useEffect(() => {
    navigation.setOptions({ title: 'Image Assessment' });
  }, [navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (currentStep === 'upload') {
        return;
      }

      const actionType = e?.data?.action?.type;
      const isBackAction = actionType === 'GO_BACK' || actionType === 'POP' || actionType === 'POP_TO_TOP';
      if (!isBackAction) {
        return;
      }

      e.preventDefault();
      if (currentStep === 'assessment') {
        setCurrentStep('analysis');
        setAssessmentStep('analysis');
        return;
      }

      if (currentStep === 'analysis') {
        setCurrentStep('upload');
        setAssessmentStep('analysis');
      }
    });

    return unsubscribe;
  }, [navigation, currentStep]);

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
      // Call the analyze-image API endpoint
      const response = await generateQuizFromImage(
        selectedImage.uri,
        'advance', // studentLevel
        additionalInstructions.trim() // additionalInstructions
      );

      // The API returns a full response with assessment, summary, etc.
      // Extract the analysis information
      const analysisData = {
        summary: response.summary || response.message || 'Image analyzed successfully.',
        subject: response.subject || subject,
        topic: response.topic || lesson,
        keywords: response.tags || response.keywords || [],
        elements: response.elements || [],
        raw_response: response, // Store full response for debugging
      };

      setImageAnalysis(analysisData);
      setValidationStatus('valid');
      setValidationMessage('✅ Image analyzed successfully!');
      setIsValidating(false);

      // Move to analysis step
      setTimeout(() => {
        setAssessmentStep('analysis');
        setCurrentStep('analysis');
      }, 350);

    } catch (error: any) {
      console.error('Image validation error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      let errorMessage = 'Unable to process this image. Please try a different image.';
      
      // Handle different error types
      if (error.message === 'Not Found' || error.response?.status === 404) {
        errorMessage = 'Image upload endpoint not available. Please check that the backend API is running and the endpoint /api/v1/upload-educational-image is configured correctly.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setValidationStatus('invalid');
      setValidationMessage(`❌ ${errorMessage}`);
      setIsValidating(false);
      
      Alert.alert('Image Upload Error', errorMessage);
    }
  };

  const generateQuiz = async (values: FormValues) => {
    setIsGenerating(true);
    
    try {
      // Prepare the prompt by combining image analysis summary with additional instructions
      let finalPrompt = '';
      
      // Add summary from image analysis
      if (imageAnalysis?.summary) {
        finalPrompt += imageAnalysis.summary;
      }
      
      // Add additional instructions
      if (values.itext.trim()) {
        // Add separator if summary exists
        if (finalPrompt) {
          finalPrompt += '\n\n';
        }
        finalPrompt += `Additional instructions: ${values.itext.trim()}`;
      }
      
      // If no content, use a default message
      if (!finalPrompt) {
        finalPrompt = 'Generate assessment questions based on the uploaded image content.';
      }

      // Call the assessment generation API (same as AI Quiz)
      // Use the FULL prompt for assessment generation to get quality questions
      const result = await generateAIQuiz({
        class: values.class,
        subject: values.subject,
        lesson: values.lesson,
        level: values.level,
        count: parseInt(values.count, 10) || 5,
        itext: finalPrompt, // Pass the full combined prompt for assessment generation
      });

      // Create a short summary for display/storage (max 500 chars)
      // This is only for metadata, NOT for assessment generation
      const displaySummary = finalPrompt.length > 500 
        ? finalPrompt.substring(0, 497) + '...' 
        : finalPrompt;
      
      const sanitizedQuiz = sanitizeQuizQuestions(result.quiz || []);
      if (!sanitizedQuiz.length) {
        setSubmitError('Assessment generation completed but returned no valid questions.');
        return;
      }

      // Refresh notifications after assessment creation
      await refreshAfterQuizGenerated();

      setClassValue(values.class);
      setSubject(values.subject);
      setLesson(values.lesson);
      setLevel(values.level);
      setQuizQuestionCount(parseInt(values.count, 10) || 5);
      setAdditionalInstructions(values.itext);
      
      const classLabel = classes.find((c: any) => c.id === values.class)?.name || values.class;
      const subjectLabel = subjects.find((s: any) => s.id === values.subject)?.name || values.subject;

      // Navigate to assessment taking screen with the generated assessment
      navigation.navigate('QuizTakingScreen', {
        quizData: {
          id: result.quiz_id,
          title: `${values.lesson} Assessment`,
          questions: sanitizedQuiz,
          class: classLabel,
          subject: subjectLabel,
          difficulty: values.level,
          lesson: values.lesson,
          additional_instructions: displaySummary, // Use truncated version for metadata
          // Thread data from the actual assessment generation
          thread_id: result.thread_id,
          thread_slug: result.thread_slug,
          reused_thread: result.reused_thread,
          regenerationParams: {
            type: 'image',
            fileUri: selectedImage.uri,
            studentLevel: values.level === 'basic' ? 'elementary' : 
                         values.level === 'intermediate' ? 'middle_school' : 
                         'pre_medical',
            classroomId: undefined,
            topic: values.lesson,
            classId: values.class,
            subjectId: values.subject,
            count: parseInt(values.count, 10) || 5,
            itext: finalPrompt,
          },
        },
        source: 'image',
        showShareButton: true,
        showActionButtons: true,
      });
    } catch (error: any) {
      console.error('Quiz generation error:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to generate assessment from image';
      setSubmitError(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBackToUpload = () => {
    setCurrentStep('upload');
    setAssessmentStep('analysis');
    // keep selectedImage so user can re-edit instructions
  };

  const handleBackToAnalysis = () => {
    setCurrentStep('analysis');
    setAssessmentStep('analysis');
  };

  const handleCloseToImageAssessment = () => {
    setCurrentStep('upload');
    setAssessmentStep('analysis');
  };

  const handleGoToAssessment = () => {
    setSubmitError('');
    setFormData({
      class: classValue,
      subject: subject,
      lesson: lesson,
      level: level,
      count: String(quizQuestionCount),
      itext: additionalInstructions,
    });
    setAssessmentStep('assessment');
    setCurrentStep('assessment');
  };

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
        <Text style={styles.headerTitle}>Create Image Quiz</Text>
        <View style={styles.headerPlaceholder} />
      </View> */}

      {currentStep === 'assessment' ? (
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
              await generateQuiz(values);
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
              <View style={[styles.headerBar, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleBackToAnalysis}
                >
                  <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Generate Assessment</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleCloseToImageAssessment}
                >
                  <Ionicons name="close" size={22} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
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
                    lessonPlaceholder="e.g., Photosynthesis, Cell Division"
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
                  style={[styles.generateButton, (isSubmitting || isGenerating) && styles.buttonDisabled]}
                  onPress={() => handleSubmit()}
                  disabled={isSubmitting || isGenerating}
                >
                  {isSubmitting || isGenerating ? (
                    <LoadingSpinner size={20} />
                  ) : (
                    <Text style={styles.generateButtonText}>Generate Assessment</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </Formik>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {currentStep === 'upload' && (
            <>
              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={styles.label}>Upload Image *</Text>
                  
                  {selectedImage ? (
                    <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                      <Image source={{ uri: imagePreviewUri || selectedImage.uri }} style={styles.selectedImage} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.imagePickerPlaceholder} onPress={pickFromCamera}>
                      <Ionicons name="image-outline" size={48} color={theme.colors.textSecondary} />
                      <Text style={styles.imagePickerText}>No image selected</Text>
                      <Text style={styles.imagePickerSubtext}>Choose an option below</Text>
                    </TouchableOpacity>
                  )}

                  {/* Image picker buttons */}
                  <View style={styles.imageButtonsRow}>
                    <TouchableOpacity 
                      style={[styles.imageButton, styles.galleryButton]} 
                      onPress={pickImage}
                    >
                      <Ionicons name="images-outline" size={20} color={theme.colors.buttonText} />
                      <Text style={[styles.imageButtonText, styles.galleryButtonText]}>Choose from Gallery</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.imageButton, styles.cameraButton]} 
                      onPress={pickFromCamera}
                    >
                      <Ionicons name="camera-outline" size={20} color={theme.colors.text} />
                      <Text style={styles.imageButtonText}>Take Photo</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.hint}>Select an image containing text, diagrams, or educational content.</Text>
                </View>

                {/* Validation Status */}
                {validationMessage !== '' && !isValidating && (
                  <View style={styles.statusContainer}>
                    <Text style={[
                      styles.validationMessage,
                      validationStatus === 'valid' ? styles.validMessage : styles.invalidMessage
                    ]}>
                      {validationMessage}
                    </Text>
                  </View>
                )}

                {/* Generation Status */}
                {isGenerating && (
                  <View style={styles.statusContainer}>
                    <View style={styles.statusRow}>
                      <LoadingSpinner size={20} />
                      <Text style={styles.statusText}>Generating assessment...</Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.generateButton,
                    (!selectedImage || isValidating || isGenerating) && styles.buttonDisabled
                  ]}
                  onPress={handleValidateAndGenerate}
                  disabled={!selectedImage || isValidating || isGenerating}
                >
                  {isValidating ? (
                    <LoadingSpinner size={20} />
                  ) : isGenerating ? (
                    <Text style={styles.generateButtonText}>Generating...</Text>
                  ) : (
                    <View style={styles.generateButtonContent}>
                      <Ionicons name="scan-outline" size={20} color={theme.colors.buttonText} />
                      <Text style={styles.generateButtonText}>Analyze Image</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {currentStep === 'analysis' && imageAnalysis && assessmentStep === 'analysis' && (
            <View style={styles.form}>
              <View style={styles.analysisHeader}>
                <View>
                  <Text style={styles.analysisTitle}>Image Analysis</Text>
                </View>
                <TouchableOpacity onPress={handleBackToUpload} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {imagePreviewUri && (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: imagePreviewUri }} style={styles.imagePreview} />
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

              <TouchableOpacity
                onPress={handleGoToAssessment}
                style={styles.generateButton}
              >
                <Text style={styles.generateButtonText}>Generate Assessment</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
      {(isValidating || isGenerating) && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <LoadingSpinner size={60} />
            <Text style={styles.loadingOverlayText}>
              {isValidating ? 'Analyzing image...' : 'Generating assessment...'}
            </Text>
            <Text style={styles.loadingOverlaySubtext}>Please wait</Text>
          </View>
        </View>
      )}
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
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  generateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  generateButtonText: {
    color: colors.buttonText,
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: colors.placeholder,
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
  footer: {
    padding: 16,
    paddingBottom: 20,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitError: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
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
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
    gap: 8,
  },
  galleryButton: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  cameraButton: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
  },
  imageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  galleryButtonText: {
    color: colors.buttonText,
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(241, 243, 232, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingOverlayText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  loadingOverlaySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
