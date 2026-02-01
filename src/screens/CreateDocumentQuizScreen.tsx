import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../core/api/config';
import QuizFormFields from '../components/QuizFormFields';
import { useDropdowns } from '../context/DropdownContext';
import ShareQuizModal from '../components/ShareQuizModal';
import ShareOptionsModal from '../components/ShareOptionsModal';
import { useTheme } from '@context/ThemeContext';
import MathRenderer from '../components/MathRenderer';
import useNotifications from '@core/hooks/useNotifications';
import LoadingSpinner from '../components/LoadingSpinner';

interface QuizQuestion {
  id?: string;
  question: string;
  options: string[];
  answer?: string;
  correctAnswer?: string;
  explanation?: string | null;
}

interface QuizData {
  quiz?: QuizQuestion[];
  questions?: QuizQuestion[];
  quiz_id?: string;
  thread_id?: string;
  thread_slug?: string;
}

export default function CreateDocumentQuizScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { refreshAfterQuizGenerated } = useNotifications();
  const { classes, subjects } = useDropdowns();
  const styles = React.useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [documentUrl, setDocumentUrl] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    displayName: string;
    uri: string;
    type: string;
    uploadedFileName?: string; // Backend uploaded filename for quiz generation
    metadata?: {
      gradeLevel: string;
      subject: string;
      lesson: string;
      board: string;
      medium: string;
      chapter: string;
      unit: string;
    };
  }>>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [inputType, setInputType] = useState<'file' | 'url' | 'camera'>('file');
  const [currentStep, setCurrentStep] = useState<'upload' | 'quiz'>('upload');
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isConvertingToPdf, setIsConvertingToPdf] = useState(false);
  
  // Quiz states
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
  const [questionResults, setQuestionResults] = useState<{ [key: number]: boolean }>({});
  const [allQuestionsVerified, setAllQuestionsVerified] = useState(false);
  
  // Quiz form states
  const [classValue, setClassValue] = useState('');
  const [subject, setSubject] = useState('');
  const [lesson, setLesson] = useState('');
  const [level, setLevel] = useState('beginner');
  const [questionCount, setQuestionCount] = useState(5);
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  
  // Loading states
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Share modal states
  const [showShareModal, setShowShareModal] = useState(false);
  const [showShareOptionsModal, setShowShareOptionsModal] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  
  // Form validation states
  const [formError, setFormError] = useState('');
  
  // Document Metadata states
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [showUploadMetadataModal, setShowUploadMetadataModal] = useState(false);
  const [pendingUploadFiles, setPendingUploadFiles] = useState<any[]>([]);
  const [pendingUploadUrl, setPendingUploadUrl] = useState('');
  const [selectedBoardType, setSelectedBoardType] = useState<string>('');
  const [documentMetadata, setDocumentMetadata] = useState({
    board: '',
    medium: '',
    chapter: '',
    unit: '',
  });
  
  // Quiz Configuration Modal state
  const [showQuizConfigModal, setShowQuizConfigModal] = useState(false);

  // File type constants
  const MAX_DOCUMENT_COUNT = 5;
  const MAX_IMAGE_COUNT = 5; // Allow up to 5 images for camera capture
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const allowedDocumentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/rtf'
  ];

  const allowedImageTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp'
  ];

  const isInitialMount = useRef(true);

  // Load uploaded files from AsyncStorage on mount
  useEffect(() => {
    loadUploadedFiles();
  }, []);

  useEffect(() => {
    // Skip saving on initial mount to avoid infinite loop
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    saveUploadedFiles();
  }, [uploadedFiles, uploadedUrls]);

  const loadUploadedFiles = async () => {
    try {
      const filesJson = await AsyncStorage.getItem('uploadedFiles');
      const urlsJson = await AsyncStorage.getItem('uploadedUrls');
      
      if (filesJson) {
        setUploadedFiles(JSON.parse(filesJson));
      }
      if (urlsJson) {
        setUploadedUrls(JSON.parse(urlsJson));
      }
    } catch (error) {
      console.error('Error loading uploaded files:', error);
    }
  };

  const saveUploadedFiles = async () => {
    try {
      await AsyncStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
      await AsyncStorage.setItem('uploadedUrls', JSON.stringify(uploadedUrls));
    } catch (error) {
      console.error('Error saving uploaded files:', error);
    }
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeUploadedUrl = (index: number) => {
    setUploadedUrls(prev => prev.filter((_, i) => i !== index));
  };

  const executeUpload = async (includeMetadata: boolean) => {
    // Validate metadata fields if includeMetadata is true
    if (includeMetadata) {
      const errors: string[] = [];
      if (!selectedBoardType) errors.push('Board Type');
      if (!classValue.trim()) errors.push('Class');
      if (!subject.trim()) errors.push('Subject');
      if (!lesson.trim()) errors.push('Lesson');
      
      if (errors.length > 0) {
        Alert.alert(
          'Required Fields Missing',
          `Please fill in the following required fields: ${errors.join(', ')}`,
          [{ text: 'OK' }]
        );
        return;
      }
    }

    setShowUploadMetadataModal(false);

    // Determine if uploading files or URL
    const isFileUpload = pendingUploadFiles.length > 0;

    // Compose grade_level based on board type
    let gradeLevel = '';
    if (includeMetadata && classValue.trim()) {
      if (selectedBoardType && selectedBoardType !== 'NONE') {
        gradeLevel = `${selectedBoardType} Board & ${classValue}`;
      } else {
        gradeLevel = classValue;
      }
    }

    if (isFileUpload) {
      // Upload files to backend API
      setUploading(true);
      console.log(`📤 Starting file upload for ${pendingUploadFiles.length} file(s)...`);
      const uploadedFileEntries: Array<{
        displayName: string;
        uri: string;
        type: string;
        uploadedFileName?: string;
        metadata?: any;
      }> = [];
      const failedFiles: string[] = [];

      for (const file of pendingUploadFiles) {
        try {
          console.log(`📄 Uploading file: ${file.name} (${file.type})`);
          const formData = new FormData();
          formData.append('file', {
            uri: file.uri,
            type: file.type || 'application/pdf',
            name: file.name,
          } as any);
          formData.append('auto_embed', 'true');

          // Add metadata if requested
          if (includeMetadata) {
            if (gradeLevel) {
              formData.append('grade_level', gradeLevel);
              console.log(`  └─ Grade Level: ${gradeLevel}`);
            }
            if (subject.trim()) {
              // Get subject label from subjects array
              const selectedSubjectObj = subjects.find(s => s.id === subject);
              const subjectLabel = selectedSubjectObj?.name || subject;
              formData.append('subject', subjectLabel);
              console.log(`  └─ Subject: ${subjectLabel}`);
            }
            if (lesson.trim()) {
              formData.append('lesson_title', lesson.trim());
              console.log(`  └─ Lesson: ${lesson.trim()}`);
            }
          }

          const response = await apiClient.post('/api/v1/rag/ingest-pdf', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000, // 60 second timeout
          });

          console.log(`✅ Upload response for ${file.name}:`, response.data);

          // Check for error in response
          if (response.data.error || response.data.success === false) {
            throw new Error(response.data.error || 'Upload failed');
          }

          // Extract uploaded filename from response
          const uploadedTitle = response.data.documents?.[0]?.title || file.name;
          console.log(`✅ File uploaded successfully. Backend filename: ${uploadedTitle}`);
          
          uploadedFileEntries.push({
            displayName: file.name,
            uri: file.uri,
            type: file.type || 'unknown',
            uploadedFileName: uploadedTitle,
            metadata: includeMetadata ? {
              gradeLevel,
              subject: subject.trim(),
              lesson: lesson.trim(),
              board: documentMetadata.board,
              medium: documentMetadata.medium,
              chapter: documentMetadata.chapter,
              unit: documentMetadata.unit,
            } : undefined
          });
        } catch (error: any) {
          console.error(`❌ Error uploading ${file.name}:`, error);
          console.error(`❌ Error response:`, error.response?.data);
          failedFiles.push(file.name);
        }
      }

      // Add successfully uploaded files to the list
      if (uploadedFileEntries.length > 0) {
        console.log(`✅ ${uploadedFileEntries.length} file(s) uploaded successfully`);
        setUploadedFiles(prev => [...prev, ...uploadedFileEntries]);
      }
      
      setPendingUploadFiles([]);
      setUploading(false);

      // Clear captured images if this was from camera
      if (inputType === 'camera') {
        setCapturedImages([]);
      }

      // Show results
      if (failedFiles.length === 0) {
        Alert.alert(
          'Success',
          `Successfully uploaded ${uploadedFileEntries.length} file(s) to server${includeMetadata ? ' (with metadata)' : ''}`,
          [{ text: 'OK' }]
        );
      } else if (uploadedFileEntries.length > 0) {
        Alert.alert(
          'Partial Success',
          `Uploaded ${uploadedFileEntries.length} file(s), but ${failedFiles.length} failed: ${failedFiles.join(', ')}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Upload Failed',
          `Failed to upload all files: ${failedFiles.join(', ')}`,
          [{ text: 'OK' }]
        );
      }
    } else if (pendingUploadUrl) {
      // Upload URL to backend API
      console.log(`📤 Starting URL upload: ${pendingUploadUrl}`);
      
      // Validate URL format
      try {
        const urlObj = new URL(pendingUploadUrl);
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
          Alert.alert(
            'Invalid URL',
            'Please enter a valid HTTP or HTTPS URL',
            [{ text: 'OK' }]
          );
          setPendingUploadUrl('');
          return;
        }
      } catch (urlError) {
        Alert.alert(
          'Invalid URL',
          'Please enter a valid URL (e.g., https://example.com/document.pdf)',
          [{ text: 'OK' }]
        );
        setPendingUploadUrl('');
        return;
      }
      
      try {
        const formData = new FormData();
        formData.append('file_url', pendingUploadUrl);
        formData.append('auto_embed', 'true');

        // Add metadata if requested
        if (includeMetadata) {
          if (gradeLevel) {
            formData.append('grade_level', gradeLevel);
            console.log(`  └─ Grade Level: ${gradeLevel}`);
          }
          if (subject.trim()) {
            // Get subject label from subjects array
            const selectedSubjectObj = subjects.find(s => s.id === subject);
            const subjectLabel = selectedSubjectObj?.name || subject;
            formData.append('subject', subjectLabel);
            console.log(`  └─ Subject: ${subjectLabel}`);
          }
          if (lesson.trim()) {
            formData.append('lesson_title', lesson.trim());
            console.log(`  └─ Lesson: ${lesson.trim()}`);
          }
        }

        const response = await apiClient.post('/api/v1/rag/ingest-pdf', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000, // 60 second timeout
        });

        console.log(`✅ URL upload response:`, response.data);

        // Check for error in response
        if (response.data.error || response.data.success === false) {
          throw new Error(response.data.error || 'Upload failed');
        }

        // Extract uploaded filename from response
        const uploadedTitle = response.data.documents?.[0]?.title || pendingUploadUrl;
        console.log(`✅ URL uploaded successfully. Backend filename: ${uploadedTitle}`);

        // Add URL to uploaded list with backend filename
        setUploadedFiles(prev => [...prev, {
          displayName: pendingUploadUrl,
          uri: pendingUploadUrl,
          type: 'url',
          uploadedFileName: uploadedTitle,
          metadata: includeMetadata ? {
            gradeLevel,
            subject: subject.trim(),
            lesson: lesson.trim(),
            board: documentMetadata.board,
            medium: documentMetadata.medium,
            chapter: documentMetadata.chapter,
            unit: documentMetadata.unit,
          } : undefined
        }]);
        
        setDocumentUrl(''); // Clear input
        setPendingUploadUrl('');

        Alert.alert(
          'Success',
          response.data.message || `URL uploaded successfully to server${includeMetadata ? ' (with metadata)' : ''}`,
          [{ text: 'OK' }]
        );
      } catch (error: any) {
        console.error('❌ Error uploading URL:', error);
        console.error('❌ Error name:', error?.name);
        console.error('❌ Error message:', error?.message);
        console.error('❌ Error response:', error?.response);
        console.error('❌ Error response data:', error?.response?.data);
        console.error('❌ Error stack:', error?.stack);
        
        // Extract detailed error message from various possible error structures
        let errorMessage = 'Failed to upload URL';
        let errorDetails = '';
        
        // Check different error structures
        if (error.response?.data) {
          const errorData = error.response.data;
          errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage;
          
          // Check for specific 403 error
          if (errorMessage.includes('HTTP 403') || errorMessage.includes('Forbidden') || error.response?.status === 403) {
            errorDetails = '\n\nThe URL is blocked (HTTP 403 Forbidden). This usually means:\n\n• The website blocks automated downloads\n• The file requires authentication\n• The URL doesn\'t allow hotlinking\n\nPlease try:\n✓ Upload the file directly instead\n✓ Use a different URL (e.g., from Google Drive, Dropbox)\n✓ Check if the URL is publicly accessible';
          }
        } else if (error.message) {
          errorMessage = error.message;
          
          // Check if error message contains 403 or forbidden
          if (errorMessage.includes('403') || errorMessage.toLowerCase().includes('forbidden') || errorMessage.toLowerCase().includes('download failed')) {
            errorDetails = '\n\nThe URL cannot be accessed (blocked or forbidden). This usually means:\n\n• The website blocks automated downloads\n• The file requires authentication\n• The URL doesn\'t allow direct access\n\nPlease try:\n✓ Upload the file directly instead\n✓ Use a publicly accessible URL\n✓ Use cloud storage (Google Drive/Dropbox) with public sharing enabled';
          }
        }
        
        Alert.alert(
          'Upload Failed',
          `${errorMessage}${errorDetails}`,
          [{ text: 'OK' }]
        );
        setPendingUploadUrl('');
      }
    }

    // Clear metadata if not including it
    if (!includeMetadata) {
      setSelectedBoardType('');
      setDocumentMetadata({
        board: '',
        medium: '',
        chapter: '',
        unit: '',
      });
    }
  };

  const handleUrlSubmit = () => {
    const trimmedUrl = documentUrl.trim();
    
    if (!trimmedUrl) {
      Alert.alert(
        'Missing URL',
        'Please enter a URL to continue.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      Alert.alert(
        'Invalid URL',
        'Please enter a valid URL starting with http:// or https://',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check for duplicate URL
    if (uploadedUrls.includes(trimmedUrl)) {
      Alert.alert(
        'Duplicate URL',
        'This URL has already been added.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Basic URL validation
    try {
      new URL(trimmedUrl);
      // Store pending URL and show metadata modal
      setPendingUploadUrl(trimmedUrl);
      setShowUploadMetadataModal(true);
    } catch (e) {
      Alert.alert(
        'Invalid URL',
        'The URL you entered is not valid. Please check and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: allowedDocumentTypes.concat(allowedImageTypes),
        copyToCacheDirectory: true,
        multiple: true, // Allow multiple selection
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newFiles = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.name || 'document',
          size: asset.size || 0,
          type: asset.mimeType || 'application/pdf',
        }));

        // Categorize files
        const documents = newFiles.filter(file => 
          allowedDocumentTypes.some(type => file.type?.includes(type))
        );
        const images = newFiles.filter(file => 
          allowedImageTypes.some(type => file.type?.includes(type))
        );

        // Validation checks
        if (documents.length > 0 && images.length > 0) {
          Alert.alert(
            'Mixed File Types',
            'Please select either documents or images, not both.',
            [{ text: 'OK' }]
          );
          return;
        }

        if (documents.length > MAX_DOCUMENT_COUNT) {
          Alert.alert(
            'Too Many Documents',
            `You can only select up to ${MAX_DOCUMENT_COUNT} documents at once.`,
            [{ text: 'OK' }]
          );
          return;
        }

        if (images.length > MAX_IMAGE_COUNT) {
          Alert.alert(
            'Too Many Images',
            `You can only select up to ${MAX_IMAGE_COUNT} image at once.`,
            [{ text: 'OK' }]
          );
          return;
        }

        // Check for duplicates
        const existingNames = uploadedFiles.map(f => f.displayName);
        const duplicates = newFiles.filter(file => existingNames.includes(file.name));
        if (duplicates.length > 0) {
          Alert.alert(
            'Duplicate Files',
            `The following files are already uploaded: ${duplicates.map(f => f.name).join(', ')}`,
            [{ text: 'OK' }]
          );
          return;
        }

        // Check file sizes
        const oversized = newFiles.filter(f => f.size && f.size > MAX_FILE_SIZE);
        if (oversized.length > 0) {
          Alert.alert(
            'File Too Large',
            `The following files exceed 10MB limit: ${oversized.map(f => f.name).join(', ')}`,
            [{ text: 'OK' }]
          );
          return;
        }

        // Validate file types
        const invalid = newFiles.filter(file => 
          !allowedDocumentTypes.some(type => file.type?.includes(type)) &&
          !allowedImageTypes.some(type => file.type?.includes(type))
        );

        if (invalid.length > 0) {
          Alert.alert(
            'Invalid File Type',
            'Please upload PDF, DOC, DOCX, TXT, RTF, or image files (PNG, JPG, JPEG, WebP) only.',
            [{ text: 'OK' }]
          );
          return;
        }

        // Store pending files and show metadata modal
        setPendingUploadFiles(newFiles);
        setShowUploadMetadataModal(true);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera permission is required to capture images.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const captureImage = async () => {
    if (capturedImages.length >= 5) {
      Alert.alert(
        'Maximum Limit Reached',
        'You can only have up to 5 images in total.',
        [{ text: 'OK' }]
      );
      return;
    }

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setCapturedImages(prev => [...prev, imageUri]);
        Alert.alert('Success', `Image captured! (${capturedImages.length + 1}/5)`);
      }
    } catch (error) {
      console.error('Error capturing image:', error);
      Alert.alert('Error', 'Failed to capture image');
    }
  };

  const pickImagesFromGallery = async () => {
    if (capturedImages.length >= 5) {
      Alert.alert(
        'Maximum Limit Reached',
        'You can only have up to 5 images in total.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5 - capturedImages.length, // Limit based on remaining slots
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const remainingSlots = 5 - capturedImages.length;
        const imagesToAdd = result.assets.slice(0, remainingSlots);
        const imageUris = imagesToAdd.map(asset => asset.uri);
        
        setCapturedImages(prev => [...prev, ...imageUris]);
        Alert.alert(
          'Success', 
          `${imagesToAdd.length} image(s) added! (${capturedImages.length + imagesToAdd.length}/5)`
        );
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images from gallery');
    }
  };

  const removeCapturedImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  const convertImagesToPdf = async (): Promise<string | null> => {
    if (capturedImages.length === 0) {
      Alert.alert('No Images', 'Please capture at least one image.');
      return null;
    }

    try {
      // Read all images as base64
      const imagePromises = capturedImages.map(async (uri) => {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return `data:image/jpeg;base64,${base64}`;
      });
      
      const base64Images = await Promise.all(imagePromises);
      
      // Create HTML with all images
      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { margin: 0; padding: 20px; }
              img { width: 100%; height: auto; page-break-after: always; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            ${base64Images.map(img => `<img src="${img}" />`).join('')}
          </body>
        </html>
      `;
      
      // Generate PDF
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      return uri;
    } catch (error) {
      console.error('Error converting images to PDF:', error);
      Alert.alert('Error', 'Failed to convert images to PDF');
      return null;
    }
  };

  const handleUploadImages = async () => {
    if (capturedImages.length === 0) {
      Alert.alert('No Images', 'Please capture at least one image.');
      return;
    }

    // Convert images to PDF
    setIsConvertingToPdf(true);
    const pdfUri = await convertImagesToPdf();
    setIsConvertingToPdf(false);

    if (!pdfUri) {
      return; // Error already shown in convertImagesToPdf
    }

    // Create PDF file object and set as pending upload
    const pdfFile = {
      uri: pdfUri,
      name: `captured_${Date.now()}.pdf`,
      size: 0,
      type: 'application/pdf',
    };

    setPendingUploadFiles([pdfFile]);
    setShowUploadMetadataModal(true);
  };

  const generateQuiz = async () => {
    // Validate input
    const hasFiles = uploadedFiles.length > 0;
    const hasUrls = uploadedUrls.length > 0;
    
    if (!hasFiles && !hasUrls) {
      Alert.alert(
        'Missing Document',
        'Please upload a document or provide a URL before generating a quiz.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Validate required fields
    setFormError('');
    const errors: string[] = [];
    
    if (!subject || !subject.trim()) {
      errors.push('Subject is required');
    }
    if (!level || !level.trim()) {
      errors.push('Difficulty level is required');
    }
    if (!lesson || !lesson.trim()) {
      errors.push('Lesson/Topic is required');
    }
    if (!additionalInstructions.trim()) {
      errors.push('Additional instructions are required');
    }
    
    if (errors.length > 0) {
      const errorMessage = errors.join('\n');
      setFormError(errorMessage);
      Alert.alert(
        'Missing Required Fields',
        errorMessage,
        [{ text: 'OK' }]
      );
      return;
    }

    setGenerating(true);
    try {
      // Get the selected class label from classes array
      const selectedClassObj = classes.find(c => c.id === classValue);
      const classLabel = selectedClassObj?.name || classValue;
      
      // Get the selected subject label from subjects array
      const selectedSubjectObj = subjects.find(s => s.id === subject);
      const subjectLabel = selectedSubjectObj?.name || subject;
      
      // Get uploaded filename from backend response (for file uploads)
      // This is the filename returned by the ingest-pdf API
      const uploadedFileName = uploadedFiles.length > 0 && uploadedFiles[0].uploadedFileName
        ? uploadedFiles[0].uploadedFileName
        : undefined;
      
      console.log('📄 Starting quiz generation...');
      console.log('📄 Uploaded filename:', uploadedFileName);
      console.log('📄 Subject:', subjectLabel);
      console.log('📄 Level:', level);
      console.log('📄 Lesson:', lesson.trim());
      console.log('📄 Question count:', questionCount);
      console.log('📄 Additional instructions:', additionalInstructions.trim());

      // Verify we have an uploaded filename (required for document quiz)
      if (!uploadedFileName) {
        Alert.alert(
          'Upload Required',
          'Please upload a document first. The document must be processed by the backend before generating a quiz.',
          [{ text: 'OK' }]
        );
        setGenerating(false);
        return;
      }
      
      // Build the quiz generation request body
      const requestBody: any = {
        subject: subjectLabel,
        level: level,
        lesson: lesson.trim(),
        count: questionCount,
        itext: additionalInstructions.trim(),
        type: 'document',
        file_name: uploadedFileName, // Send the backend filename for document-based quiz
      };
      
      // Add class if provided
      if (classLabel) {
        requestBody.class = classLabel;
      }
      
      console.log('📤 Sending quiz generation request:', JSON.stringify(requestBody, null, 2));
      
      // Call the quiz generation API with the document
      const response = await apiClient.post('/api/v1/quiz/generate', requestBody, {
        timeout: 90000, // 90 seconds for quiz generation
      });
      const result = response.data;
      
      // Debug log the response
      console.log('📨 Quiz generation response:', JSON.stringify(result, null, 2));
      
      // Extract questions - try different possible response structures
      let questions = result.quiz || result.questions || [];
      
      // If first API call returns empty quiz (thread creation), retry with the thread_id
      if ((!questions || questions.length === 0) && result.thread_id && !result.reused_thread) {
        console.log('⚠️ First request created thread but no questions. Retrying with thread_id...');
        
        try {
          // Retry the API call - thread now exists
          const retryResponse = await apiClient.post('/api/v1/quiz/generate', requestBody, {
            timeout: 90000,
          });
          const retryResult = retryResponse.data;
          console.log('📨 Retry response:', JSON.stringify(retryResult, null, 2));
          
          questions = retryResult.quiz || retryResult.questions || [];
          
          if (questions && questions.length > 0) {
            // Update result with retry data
            Object.assign(result, retryResult);
            console.log(`✅ Retry successful: Generated ${questions.length} questions`);
          }
        } catch (retryError) {
          console.error('❌ Retry failed:', retryError);
        }
      }
      
      if (!questions || questions.length === 0) {
        console.warn('⚠️ No questions in response after retry. Full response:', result);
        Alert.alert(
          'No Questions Generated',
          'The quiz generation completed but returned no questions. Please try again with different parameters.',
          [{ text: 'OK' }]
        );
        setGenerating(false);
        return;
      }
      
      console.log(`✅ Generated ${questions.length} questions successfully`);
      
      // Close the modal before navigation
      setShowQuizConfigModal(false);
      
      // Refresh notifications
      await refreshAfterQuizGenerated();
      
      // Navigate to quiz screen with generated quiz data
      navigation.replace('QuizTakingScreen', {
        quizData: {
          id: result.quiz_id,
          title: `${lesson.trim()} Quiz`,
          questions: questions,
          class: classLabel,
          subject: subjectLabel,
          difficulty: level,
          lesson: lesson.trim(),
          additional_instructions: additionalInstructions.trim(),
          // Thread data from the quiz generation response
          thread_id: result.thread_id,
          thread_slug: result.thread_slug,
          reused_thread: result.reused_thread,
          // Regeneration parameters - store uploaded filename for regeneration
          regenerationParams: {
            type: 'document',
            classId: classValue, // Store the ID for API calls
            subjectId: subject, // Store the ID for API calls
            count: questionCount,
            itext: additionalInstructions.trim(),
            uploadedFileName: uploadedFileName, // Store uploaded filename for regeneration
            grade: classLabel,
            subject: subjectLabel,
            level: level,
            lesson: lesson.trim(),
            metadata: uploadedFiles.length > 0 ? uploadedFiles[0].metadata : undefined,
          },
        },
        showShareButton: true, // Show share button at top
        showActionButtons: true, // Show Regenerate, Retake, New Quiz buttons
      });
    } catch (error: any) {
      console.error('❌ Failed to generate quiz:', error);
      console.error('❌ Error response:', error.response?.data);
      
      // Extract detailed error message
      let errorMessage = 'Failed to generate quiz. Please try again.';
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setFormError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  const handleAnswerSelection = (questionIndex: number, selectedOption: string) => {
    if (allQuestionsVerified) return;

    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: selectedOption,
    }));
  };

  const verifyAllAnswers = () => {
    const results: { [key: number]: boolean } = {};
    const questions = quizData?.questions || [];

    questions.forEach((question, index) => {
      const selectedAnswer = selectedAnswers[index];
      const correctAnswer = question.correctAnswer || question.answer;
      results[index] = selectedAnswer === correctAnswer;
    });

    setQuestionResults(results);
    setAllQuestionsVerified(true);
  };

  const handleStartNew = () => {
    setDocumentUrl('');
    setUploadedFiles([]);
    setUploadedUrls([]);
    setQuizData(null);
    setCurrentStep('upload');
    setClassValue('');
    setSubject('');
    setLesson('');
    setLevel('beginner');
    setQuestionCount(5);
    setAdditionalInstructions('');
    setSelectedAnswers({});
    setQuestionResults({});
    setAllQuestionsVerified(false);
    setSelectedBoardType('');
    setDocumentMetadata({
      board: '',
      medium: '',
      chapter: '',
      unit: '',
    });
    
    // Clear AsyncStorage
    AsyncStorage.removeItem('uploadedFiles');
    AsyncStorage.removeItem('uploadedUrls');
  };

  const handleRetakeQuiz = () => {
    setSelectedAnswers({});
    setQuestionResults({});
    setAllQuestionsVerified(false);
  };

  const handleGenerateAnotherQuiz = () => {
    setQuizData(null);
    setSelectedAnswers({});
    setQuestionResults({});
    setAllQuestionsVerified(false);
    setCurrentStep('upload');
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
        <Text style={styles.headerTitle}>Create Document Quiz</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {currentStep === 'upload' && (
        <View style={styles.uploadContainer}>
          <View style={styles.header}>
            <Ionicons name="document-text" size={64} color={theme.colors.success} />
            <Text style={styles.title}>Document Quiz Generator</Text>
            <Text style={styles.subtitle}>Generate quiz questions from any document or URL</Text>
          </View>

          {/* Input Type Selector */}
          <View style={styles.inputTypeSelector}>
            <TouchableOpacity
              style={[styles.inputTypeButton, inputType === 'file' && styles.inputTypeButtonActive]}
              onPress={() => setInputType('file')}
            >
              <Ionicons 
                name="document" 
                size={20} 
                color={inputType === 'file' ? theme.colors.buttonText : theme.colors.text} 
              />
              <Text style={[
                styles.inputTypeText,
                inputType === 'file' && styles.inputTypeTextActive
              ]}>
                Upload
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.inputTypeButton, inputType === 'camera' && styles.inputTypeButtonActive]}
              onPress={() => setInputType('camera')}
            >
              <Ionicons 
                name="camera" 
                size={20} 
                color={inputType === 'camera' ? theme.colors.buttonText : theme.colors.text} 
              />
              <Text style={[
                styles.inputTypeText,
                inputType === 'camera' && styles.inputTypeTextActive
              ]}>
                Camera
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.inputTypeButton, inputType === 'url' && styles.inputTypeButtonActive]}
              onPress={() => setInputType('url')}
            >
              <Ionicons 
                name="link" 
                size={20} 
                color={inputType === 'url' ? theme.colors.buttonText : theme.colors.text} 
              />
              <Text style={[
                styles.inputTypeText,
                inputType === 'url' && styles.inputTypeTextActive
              ]}>
                URL
              </Text>
            </TouchableOpacity>
          </View>

          {inputType === 'file' ? (
            <>
              <TouchableOpacity
                style={styles.uploadBox}
                onPress={pickDocument}
              >
                <View style={styles.uploadPrompt}>
                  <Ionicons name="cloud-upload-outline" size={48} color={theme.colors.textSecondary} />
                  <Text style={styles.uploadText}>Tap to upload documents or images</Text>
                  <Text style={styles.uploadSubtext}>
                    Documents: PDF, DOC, DOCX, TXT (up to 5 files)
                    {'\n'}Images: PNG, JPG, JPEG, WebP (1 file)
                    {'\n'}Max 10MB per file
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <View style={styles.uploadedFilesList}>
                  <Text style={styles.uploadedFilesTitle}>Uploaded Files:</Text>
                  {uploadedFiles.map((file, index) => (
                    <View key={index} style={styles.uploadedFileItem}>
                      <View style={styles.uploadedFileInfo}>
                        <Ionicons 
                          name={file.type.includes('image') ? 'image' : 'document-text'} 
                          size={24} 
                          color={theme.colors.primary} 
                        />
                        <Text style={styles.uploadedFileName} numberOfLines={1}>
                          {file.displayName}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => removeUploadedFile(index)}
                        style={styles.removeButton}
                      >
                        <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : inputType === 'camera' ? (
            <>
              {/* Camera and Gallery Buttons */}
              <View style={styles.imageSourceButtons}>
                <TouchableOpacity
                  style={[styles.imageSourceButton, capturedImages.length >= 5 && styles.buttonDisabled]}
                  onPress={captureImage}
                  disabled={capturedImages.length >= 5}
                >
                  <Ionicons name="camera" size={32} color={capturedImages.length >= 5 ? theme.colors.placeholder : theme.colors.primary} />
                  <Text style={[styles.imageSourceButtonText, capturedImages.length >= 5 && styles.imageSourceButtonTextDisabled]}>
                    Capture Image
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.imageSourceButton, capturedImages.length >= 5 && styles.buttonDisabled]}
                  onPress={pickImagesFromGallery}
                  disabled={capturedImages.length >= 5}
                >
                  <Ionicons name="images" size={32} color={capturedImages.length >= 5 ? theme.colors.placeholder : theme.colors.primary} />
                  <Text style={[styles.imageSourceButtonText, capturedImages.length >= 5 && styles.imageSourceButtonTextDisabled]}>
                    Choose from Gallery
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.imageCountText}>
                {capturedImages.length}/5 images selected
                {capturedImages.length >= 5 ? ' (Maximum limit reached)' : ''}
              </Text>

              {/* Captured Images Grid */}
              {capturedImages.length > 0 && (
                <View style={styles.capturedImagesContainer}>
                  <Text style={styles.capturedImagesTitle}>Captured Images:</Text>
                  <View style={styles.imagesGrid}>
                    {capturedImages.map((imageUri, index) => (
                      <View key={index} style={styles.imageCard}>
                        <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                        <TouchableOpacity
                          style={styles.imageRemoveButton}
                          onPress={() => removeCapturedImage(index)}
                        >
                          <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                        </TouchableOpacity>
                        <Text style={styles.imageNumber}>#{index + 1}</Text>
                      </View>
                    ))}
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.button, styles.convertButton]}
                    onPress={handleUploadImages}
                  >
                    <Ionicons name="flash" size={20} color={theme.colors.buttonText} style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Upload Images</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Uploaded PDF Files (after conversion) */}
              {uploadedFiles.length > 0 && (
                <View style={styles.uploadedFilesList}>
                  <Text style={styles.uploadedFilesTitle}>Uploaded Files:</Text>
                  {uploadedFiles.map((file, index) => (
                    <View key={index} style={styles.uploadedFileItem}>
                      <View style={styles.uploadedFileInfo}>
                        <Ionicons 
                          name="document-text" 
                          size={24} 
                          color={theme.colors.primary} 
                        />
                        <Text style={styles.uploadedFileName} numberOfLines={1}>
                          {file.displayName}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => removeUploadedFile(index)}
                        style={styles.removeButton}
                      >
                        <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <>
              <View style={styles.urlInputContainer}>
                <TextInput
                  style={styles.urlInput}
                  value={documentUrl}
                  onChangeText={setDocumentUrl}
                  placeholder="Enter document URL (e.g., https://example.com/document.pdf)"
                  placeholderTextColor={theme.colors.placeholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handleUrlSubmit}
                />
                {documentUrl.trim() !== '' && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => setDocumentUrl('')}
                  >
                    <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Add URL Button */}
              {documentUrl.trim() !== '' && (
                <TouchableOpacity
                  style={styles.addUrlButton}
                  onPress={handleUrlSubmit}
                >
                  <Ionicons name="add-circle" size={20} color={theme.colors.buttonText} />
                  <Text style={styles.addUrlButtonText}>Add URL</Text>
                </TouchableOpacity>
              )}

              {/* Uploaded URLs List */}
              {uploadedUrls.length > 0 && (
                <View style={styles.uploadedFilesList}>
                  <Text style={styles.uploadedFilesTitle}>Added URLs:</Text>
                  {uploadedUrls.map((url, index) => (
                    <View key={index} style={styles.uploadedFileItem}>
                      <View style={styles.uploadedFileInfo}>
                        <Ionicons name="link" size={24} color={theme.colors.primary} />
                        <Text style={styles.uploadedFileName} numberOfLines={1}>
                          {url}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => removeUploadedUrl(index)}
                        style={styles.removeButton}
                      >
                        <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
              
          <View style={styles.formField}>
            <Text style={styles.label}>Additional Instructions</Text>
            <TextInput
              style={styles.inputMultiline}
              value={additionalInstructions}
              onChangeText={setAdditionalInstructions}
              placeholder="Enter specific instructions for quiz generation (optional)"
              placeholderTextColor={theme.colors.placeholder}
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={[styles.button]}
            onPress={() => setShowQuizConfigModal(true)}
          >
            <Ionicons name="flash" size={20} color={theme.colors.buttonText} style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Generate Quiz</Text>
          </TouchableOpacity>
        </View>
      )}

      {currentStep === 'quiz' && quizData && quizData.questions && quizData.questions.length > 0 && (
        <View style={styles.quizContainer}>
          {/* Quiz Stats */}
          {allQuestionsVerified && (
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{Object.values(questionResults).filter(r => r).length}</Text>
                <Text style={styles.statLabel}>✓ Correct</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{Object.values(questionResults).filter(r => !r).length}</Text>
                <Text style={styles.statLabel}>✗ Incorrect</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{quizData.questions.length - Object.keys(selectedAnswers).length}</Text>
                <Text style={styles.statLabel}>○ Unanswered</Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.regenerateButton]}
              onPress={handleStartNew}
            >
              <Ionicons name="refresh" size={18} color={theme.colors.buttonText} />
              <Text style={styles.actionButtonText}>New</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.retakeButton]}
              onPress={handleRetakeQuiz}
            >
              <Ionicons name="reload" size={18} color={theme.colors.buttonText} />
              <Text style={styles.actionButtonText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.generateButton]}
              onPress={handleGenerateAnotherQuiz}
            >
              <Ionicons name="sparkles" size={18} color={theme.colors.buttonText} />
              <Text style={styles.actionButtonText}>Generate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.shareButton]}
              onPress={() => setShowShareModal(true)}
            >
              <Ionicons name="share-social" size={18} color={theme.colors.buttonText} />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Quiz Questions */}
          <View style={styles.questionsContainer}>
            {quizData.questions.map((question, index) => {
              const isCorrect = questionResults[index] === true;
              const isWrong = questionResults[index] === false;

              return (
                <View key={question.id || index} style={styles.questionCard}>
                  <View style={styles.questionHeader}>
                    <Text style={styles.questionNumber}>Q{index + 1}</Text>
                    {allQuestionsVerified && (
                      isCorrect ? (
                        <View style={styles.correctBadge}>
                          <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                          <Text style={styles.correctBadgeText}>Correct</Text>
                        </View>
                      ) : isWrong ? (
                        <View style={styles.wrongBadge}>
                          <Ionicons name="close-circle" size={20} color={theme.colors.error} />
                          <Text style={styles.wrongBadgeText}>Wrong</Text>
                        </View>
                      ) : null
                    )}
                  </View>

                  <MathRenderer text={question.question} colors={theme.colors} />

                  <View style={styles.optionsContainer}>
                    {question.options.map((option, optionIndex) => {
                      const optionLetter = String.fromCharCode(65 + optionIndex);
                      const isSelected = selectedAnswers[index] === option;
                      const isCorrectOption = allQuestionsVerified && option === question.correctAnswer;
                      const isWrongSelection = allQuestionsVerified && isSelected && !isCorrectOption;

                      return (
                        <TouchableOpacity
                          key={optionIndex}
                          style={[
                            styles.optionButton,
                            isSelected && !allQuestionsVerified && styles.optionButtonSelected,
                            isCorrectOption && styles.optionButtonCorrect,
                            isWrongSelection && styles.optionButtonWrong,
                          ]}
                          onPress={() => handleAnswerSelection(index, option)}
                          disabled={allQuestionsVerified}
                        >
                          <View style={styles.optionContent}>
                            <Text style={[
                              styles.optionLetter,
                              isSelected && !allQuestionsVerified && styles.optionLetterSelected,
                              isCorrectOption && styles.optionLetterCorrect,
                              isWrongSelection && styles.optionLetterWrong,
                            ]}>
                              {optionLetter}
                            </Text>
                            <MathRenderer text={option} colors={theme.colors} />
                          </View>
                          {allQuestionsVerified && (
                            isCorrectOption ? (
                              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                            ) : isWrongSelection ? (
                              <Ionicons name="close-circle" size={20} color={theme.colors.error} />
                            ) : null
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Submit Button */}
          {!allQuestionsVerified && (
            <TouchableOpacity
              style={[
                styles.submitButton,
                Object.keys(selectedAnswers).length === 0 && styles.submitButtonDisabled
              ]}
              onPress={verifyAllAnswers}
              disabled={Object.keys(selectedAnswers).length === 0}
            >
              <Text style={styles.submitButtonText}>Submit Answers</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ShareQuizModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        quizData={{
          id: quizData?.quiz_id || 'doc-quiz',
          title: lesson,
          questionsCount: quizData?.questions?.length || 0,
          class: classValue,
          subject: subject,
          difficulty: level,
          thread_id: Number(quizData?.thread_id),
          thread_slug: quizData?.thread_slug,
        }}
      />

      <ShareOptionsModal
        visible={showShareOptionsModal}
        onClose={() => setShowShareOptionsModal(false)}
        shareUrl={shareUrl || ''}
      />

      {/* Document Metadata Modal */}
      <Modal
        visible={showMetadataModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMetadataModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.quizConfigModalContainer}>
            <View style={styles.summaryModalHeader}>
              <Text style={styles.modalTitle}>Document Metadata</Text>
              <TouchableOpacity
                onPress={() => setShowMetadataModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.quizConfigContent}>
              <Text style={styles.quizConfigDescription}>
                Add additional context about the document to improve quiz quality.
              </Text>

              <View style={styles.metadataFormField}>
                <Text style={styles.metadataLabel}>Board Type</Text>
                <View style={styles.boardTypeSelector}>
                  {['CBSE', 'ICSE', 'State Board', 'IB', 'IGCSE', 'Other'].map((board) => (
                    <TouchableOpacity
                      key={board}
                      style={[
                        styles.boardTypeButton,
                        selectedBoardType === board && styles.boardTypeButtonActive
                      ]}
                      onPress={() => setSelectedBoardType(board)}
                    >
                      <Text style={[
                        styles.boardTypeText,
                        selectedBoardType === board && styles.boardTypeTextActive
                      ]}>
                        {board}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.metadataFormField}>
                <Text style={styles.metadataLabel}>Board/Curriculum</Text>
                <TextInput
                  style={styles.metadataInput}
                  value={documentMetadata.board}
                  onChangeText={(text) => setDocumentMetadata({ ...documentMetadata, board: text })}
                  placeholder="e.g., Maharashtra Board, UP Board"
                  placeholderTextColor={theme.colors.placeholder}
                />
              </View>

              <View style={styles.metadataFormField}>
                <Text style={styles.metadataLabel}>Medium</Text>
                <TextInput
                  style={styles.metadataInput}
                  value={documentMetadata.medium}
                  onChangeText={(text) => setDocumentMetadata({ ...documentMetadata, medium: text })}
                  placeholder="e.g., English, Hindi"
                  placeholderTextColor={theme.colors.placeholder}
                />
              </View>

              <View style={styles.metadataFormField}>
                <Text style={styles.metadataLabel}>Chapter</Text>
                <TextInput
                  style={styles.metadataInput}
                  value={documentMetadata.chapter}
                  onChangeText={(text) => setDocumentMetadata({ ...documentMetadata, chapter: text })}
                  placeholder="e.g., Chapter 1, Introduction"
                  placeholderTextColor={theme.colors.placeholder}
                />
              </View>

              <View style={styles.metadataFormField}>
                <Text style={styles.metadataLabel}>Unit/Topic</Text>
                <TextInput
                  style={styles.metadataInput}
                  value={documentMetadata.unit}
                  onChangeText={(text) => setDocumentMetadata({ ...documentMetadata, unit: text })}
                  placeholder="e.g., Unit 1, Algebra"
                  placeholderTextColor={theme.colors.placeholder}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </ScrollView>

            <View style={styles.summaryModalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => setShowMetadataModal(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, { flex: 1 }]}
                onPress={() => setShowMetadataModal(false)}
              >
                <Text style={styles.primaryButtonText}>Save Metadata</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Upload Metadata Modal */}
      <Modal
        visible={showUploadMetadataModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowUploadMetadataModal(false);
          setPendingUploadFiles([]);
          setPendingUploadUrl('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.quizConfigModalContainer}>
            <View style={styles.summaryModalHeader}>
              <Text style={styles.modalTitle}>Add Document Metadata</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowUploadMetadataModal(false);
                  setPendingUploadFiles([]);
                  setPendingUploadUrl('');
                }}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.quizConfigContent}>
              <Text style={styles.quizConfigDescription}>
                You can optionally provide class, subject, and lesson information to help organize this document.
              </Text>

              <View style={styles.metadataFormField}>
                <Text style={styles.metadataLabel}>Board Type *</Text>
                <View style={styles.boardTypeSelector}>
                  {['CBSE', 'ICSE', 'State Board', 'IB', 'IGCSE', 'Other'].map((board) => (
                    <TouchableOpacity
                      key={board}
                      style={[
                        styles.boardTypeButton,
                        selectedBoardType === board && styles.boardTypeButtonActive
                      ]}
                      onPress={() => setSelectedBoardType(board)}
                    >
                      <Text style={[
                        styles.boardTypeText,
                        selectedBoardType === board && styles.boardTypeTextActive
                      ]}>
                        {board}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

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
                lessonPlaceholder="Enter lesson name (e.g., 'Introduction to Biology', 'Ancient History')"
                lessonLabel="Lesson"
                
                showDifficultyLevel={true}
                difficultyValue={level}
                onDifficultyChange={setLevel}
                
                showQuestionCount={false}
                
                additionalInstructionsValue={additionalInstructions}
                onAdditionalInstructionsChange={setAdditionalInstructions}
              />
            </ScrollView>

            <View style={styles.summaryModalFooter}>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => executeUpload(false)}
                >
                  <Text style={styles.secondaryButtonText}>Skip Metadata</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton, { flex: 1 }]}
                  onPress={() => executeUpload(true)}
                >
                  <Text style={styles.primaryButtonText}>Upload with Metadata</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Quiz Configuration Modal */}
      <Modal
        visible={showQuizConfigModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQuizConfigModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.quizConfigModalContainer}>
            <View style={styles.summaryModalHeader}>
              <Text style={styles.modalTitle}>Quiz Configuration</Text>
              <TouchableOpacity
                onPress={() => setShowQuizConfigModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.quizConfigContent}>
              <Text style={styles.quizConfigDescription}>
                Configure your quiz settings below. All fields are required to generate a quality quiz.
              </Text>

              {formError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

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
                lessonPlaceholder="Enter lesson name (e.g., 'Introduction to Biology', 'Ancient History')"
                lessonLabel="Lesson/Topic"
                
                showDifficultyLevel={true}
                difficultyValue={level}
                onDifficultyChange={setLevel}
                
                showQuestionCount={true}
                questionCountValue={String(questionCount)}
                onQuestionCountChange={(value: string) => setQuestionCount(Number(value))}
                
                additionalInstructionsValue={additionalInstructions}
                onAdditionalInstructionsChange={setAdditionalInstructions}
              />
            </ScrollView>

            <View style={styles.summaryModalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => setShowQuizConfigModal(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  (!subject || !level || !lesson.trim() || !additionalInstructions.trim() || generating) && styles.buttonDisabled
                ]}
                onPress={generateQuiz}
                disabled={!subject || !level || !lesson.trim() || !additionalInstructions.trim() || generating}
              >
                {generating ? (
                  <LoadingSpinner size={20} />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={20} color={theme.colors.buttonText} style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Generate {questionCount} Questions</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PDF Conversion Loading Overlay */}
      {isConvertingToPdf && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <LoadingSpinner size={60} />
            <Text style={styles.loadingText}>Converting images to PDF...</Text>
            <Text style={styles.loadingSubtext}>This may take a few moments</Text>
          </View>
        </View>
      )}

      {/* Document Upload Loading Overlay */}
      {uploading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <LoadingSpinner size={60} />
            <Text style={styles.loadingText}>Uploading document...</Text>
            <Text style={styles.loadingSubtext}>Please wait</Text>
          </View>
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
  uploadContainer: {
    padding: 20,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
  },
  uploadBox: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    marginBottom: 24,
  },
  uploadBoxSelected: {
    borderColor: colors.success,
    backgroundColor: colors.cardBackground,
  },
  uploadPrompt: {
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  uploadSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  fileInfo: {
    alignItems: 'center',
  },
  fileName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  fileSize: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  formField: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  inputMultiline: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    color: colors.text,
    backgroundColor: colors.cardBackground,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: colors.placeholder,
  },
  buttonText: {
    color: colors.buttonText,
    fontSize: 18,
    fontWeight: 'bold',
  },
  analysisContainer: {
    padding: 20,
  },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  analysisTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  metadataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  metadataButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  summaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  summaryButtonText: {
    color: colors.buttonText,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  keywordsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  keywordsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  keywordsText: {
    fontSize: 14,
    color: colors.text,
  },
  quizFormSection: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBackground,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: colors.error,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  secondaryButton: {
    backgroundColor: colors.textSecondary,
    flex: 1,
  },
  secondaryButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
  // Input Type Selector
  inputTypeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  inputTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  inputTypeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  inputTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  inputTypeTextActive: {
    color: colors.buttonText,
  },
  // URL Input
  urlInputContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  urlInput: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.cardBackground,
    paddingRight: 45,
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 16,
  },
  // Quiz Container
  quizContainer: {
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 8,
  },
  regenerateButton: {
    backgroundColor: colors.success,
  },
  retakeButton: {
    backgroundColor: colors.info,
  },
  generateButton: {
    backgroundColor: colors.warning,
  },
  shareButton: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  questionsContainer: {
    gap: 16,
  },
  questionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  correctBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  correctBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  wrongBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.errorBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  wrongBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
  optionsContainer: {
    marginTop: 12,
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.inputBackground,
  },
  optionButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBackground,
  },
  optionButtonCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.successBackground,
  },
  optionButtonWrong: {
    borderColor: colors.error,
    backgroundColor: colors.errorBackground,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionLetter: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textSecondary,
    width: 24,
  },
  optionLetterSelected: {
    color: colors.primary,
  },
  optionLetterCorrect: {
    color: colors.success,
  },
  optionLetterWrong: {
    color: colors.error,
  },
  submitButton: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: colors.placeholder,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Document Summary Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryModalContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  summaryModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  modalCloseButton: {
    padding: 8,
  },
  summaryModalContent: {
    padding: 20,
  },
  summarySection: {
    marginBottom: 24,
  },
  summarySectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  summarySectionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: colors.primaryBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  elementsContainer: {
    gap: 8,
  },
  elementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  elementText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Metadata Modal styles
  metadataModalContainer: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 0,
    width: '95%',
    maxWidth: 600,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  metadataModalContent: {
    padding: 20,
    maxHeight: 400,
  },
  metadataDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  metadataFormField: {
    marginBottom: 16,
  },
  metadataLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  metadataInput: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
  },
  metadataRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  metadataKey: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 80,
  },
  metadataValue: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  // Uploaded Files List styles
  uploadedFilesList: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  uploadedFilesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  uploadedFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: colors.inputBackground,
    borderRadius: 8,
    marginBottom: 8,
  },
  uploadedFileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  uploadedFileName: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  removeButton: {
    padding: 8,
  },
  // Add URL Button styles
  addUrlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  addUrlButtonText: {
    color: colors.buttonText,
    fontSize: 14,
    fontWeight: '600',
  },
  // Board Type Selector styles
  boardTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  boardTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBackground,
  },
  boardTypeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  boardTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  boardTypeTextActive: {
    color: colors.buttonText,
  },
  requiredNote: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  quizConfigModalContainer: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 0,
    width: '95%',
    maxWidth: 600,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  quizConfigContent: {
    padding: 20,
    maxHeight: 600,
  },
  quizConfigDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  cameraBox: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    marginBottom: 24,
  },
  cameraPrompt: {
    alignItems: 'center',
  },
  cameraText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  cameraSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  capturedImagesContainer: {
    marginBottom: 24,
  },
  capturedImagesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  imageCard: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageRemoveButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
  },
  imageNumber: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 'bold',
  },
  convertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageSourceButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  imageSourceButton: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imageSourceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  imageSourceButtonTextDisabled: {
    color: colors.placeholder,
  },
  imageCountText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
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
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
