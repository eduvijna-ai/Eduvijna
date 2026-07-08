import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import ModalDropdownField from './ModalDropdownField';
import { useTheme } from '@context/ThemeContext';
import { useAuth } from '@core/hooks/useAuth';
import { apiClient, API_BASE_URL } from '@core/api/config';
import { fetchTeacherClassrooms } from '@core/services/dashboardApi';
import { createQuizAssignment, createClassroomQuiz } from '../core/services/quizzes';
import { getAccessToken } from '@core/services/tokenStorage';
import { fullScreenModalOverlay, getFullScreenModalProps } from './fullScreenModal';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer?: string;
  answer?: string;
  explanation: string | null;
}

interface ShareQuizModalProps {
  visible: boolean;
  onClose: () => void;
  quizData: {
    thread_id?: number;
    thread_slug?: string;
    quiz?: QuizQuestion[];
    questions?: QuizQuestion[];
    id?: string;
    title?: string;
    questionsCount?: number;
    class?: string;
    subject?: string;
    difficulty?: string;
  } | null;
  quizMetadata?: {
    class?: string;
    subject?: string;
    lesson?: string;
    difficulty_level?: string;
    question_count?: number;
    additional_instructions?: string;
  };
  onShareSuccess?: (shareUrl: string) => void;
}

interface Classroom {
  classroom_id: string;
  classroom_name: string;
  //student_count: number;
  total_count?: number;
  students?: any[];
}

const SHARE_SUBJECT_OPTIONS = [
  { id: 'math', name: 'Mathematics' },
  { id: 'science', name: 'Science' },
  { id: 'english', name: 'English' },
  { id: 'history', name: 'History' },
  { id: 'general', name: 'General' },
];

const SHARE_DURATION_OPTIONS = [
  { id: '15', name: '15 minutes' },
  { id: '30', name: '30 minutes' },
  { id: '45', name: '45 minutes' },
  { id: '60', name: '60 minutes' },
  { id: '90', name: '90 minutes' },
  { id: '120', name: '120 minutes' },
];

const SHARE_STATUS_OPTIONS = [
  { id: 'active', name: 'Active' },
  { id: 'inactive', name: 'Inactive' },
  { id: 'draft', name: 'Draft' },
];

const ShareQuizModal: React.FC<ShareQuizModalProps> = ({
  visible,
  onClose,
  quizData,
  quizMetadata,
  onShareSuccess,
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const {user} = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);

  // Get quiz array from quizData
  const quiz = quizData?.quiz || quizData?.questions || [];
  
  // Calculate question count safely
  const questionCount = quizMetadata?.question_count || quizData?.questionsCount || quiz.length || 0;
  
  // Form state - Pre-fill with metadata if available
  const topic = quizMetadata?.lesson || quizData?.title || `Quiz - ${questionCount} Questions`;
  const [fileName, setFileName] = useState('');
  const [subject, setSubject] = useState(
    quizMetadata?.subject?.toLowerCase() || quizData?.subject?.toLowerCase() || 'math'
  );
  
  // Map difficulty levels to match new standard levels
  const mapDifficultyLevel = (level?: string): string => {
    const mapping: {[key: string]: string} = {
      'easy': 'beginner',
      'medium': 'intermediate',
      'hard': 'advanced',
      'basic': 'beginner',
      'beginner': 'beginner',
      'elementary': 'elementary',
      'intermediate': 'intermediate',
      'upper_intermediate': 'upper_intermediate',
      'advanced': 'advanced',
      'expert': 'expert',
      'master': 'master'
    };
    return mapping[level?.toLowerCase() || ''] || 'intermediate';
  };
  
  const [difficulty, setDifficulty] = useState(
    mapDifficultyLevel(quizMetadata?.difficulty_level || quizData?.difficulty)
  );
  const [studentLevel, setStudentLevel] = useState('elementary');
  const [isPublic, setIsPublic] = useState(user?.role === 'student');
  const isTimer = true; // Always enabled
  const [duration, setDuration] = useState('30');
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState('active');
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startPickerMode, setStartPickerMode] = useState<'date' | 'time'>('date');
  const [endPickerMode, setEndPickerMode] = useState<'date' | 'time'>('date');

  // Initialize end time when modal opens
  useEffect(() => {
    if (visible) {
      const now = new Date();
      setStartTime(now);
      setEndTime(new Date(now.getTime() + 24 * 60 * 60 * 1000));
    }
  }, [visible]);

  // Update end time when start time changes
  useEffect(() => {
    if (visible) {
      const newEndTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
      if (endTime <= startTime) {
        setEndTime(newEndTime);
      }
    }
  }, [startTime, visible]);

  // Update summary when modal opens or data changes
  useEffect(() => {
    if (visible) {
      const count = quizMetadata?.question_count || quizData?.questionsCount || quiz.length || 0;
      const defaultSummary = `Quiz - ${count} question${count !== 1 ? 's' : ''}`;
      const rawSummary = quizMetadata?.additional_instructions || defaultSummary;
      const truncatedSummary = rawSummary.length > 500 
        ? rawSummary.substring(0, 497) + '...' 
        : rawSummary;
      setSummary(truncatedSummary);
    }
  }, [visible, quizMetadata, quizData]);

  useEffect(() => {
    if (visible) {
      fetchClassrooms();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const subjectPrefix = subject.substring(0, 4).toUpperCase();
      const generatedFileName = `${subjectPrefix}_Quiz_${timestamp}`;
      setFileName(generatedFileName);
    }
  }, [visible, subject]);

  const fetchClassrooms = async () => {
    try {
      if (!user || user.role === 'student') {
        setClassrooms([]);
        return;
      }
      
      try {
        // Use dashboardApi service to fetch classrooms
        const response = await fetchTeacherClassrooms();
        const classroomList = response.data || [];
        console.log('📚 Fetched classrooms:', classroomList.map((c: any) => ({
          id: c.classroom_id,
          name: c.classroom_name,
          total_count: c.total_count,
          student_count: c.student_count,
          students_length: c.students?.length || 0,
        })));
        
        // Classrooms already have parsed students from fetchTeacherClassrooms
        const normalizedClassrooms: Classroom[] = classroomList.map((c: any) => ({
          classroom_id: c.classroom_id,
          classroom_name: c.classroom_name,
          total_count: c.total_count || c.student_count || c.students?.length || 0,
          students: c.students || [],
        }));
        setClassrooms(normalizedClassrooms);
        if (normalizedClassrooms.length > 0) {
          setSelectedClassroom(normalizedClassrooms[0].classroom_id);
        }
      } catch (apiError) {
        // API endpoint might not exist - set empty classrooms and continue
        console.warn('Could not fetch classrooms - API may not be available:', apiError);
        setClassrooms([]);
      }
    } catch (error) {
      console.error('Error in fetchClassrooms:', error);
      setClassrooms([]);
    }
  };

  const handleShare = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to share a quiz');
      return;
    }

    if (!topic.trim()) {
      Alert.alert('Validation Error', 'Quiz topic is required');
      return;
    }
    // Classroom is optional for public quizzes and students
    if (user.role !== 'student' && !isPublic && classrooms.length > 0 && !selectedClassroom) {
      Alert.alert('Validation Error', 'Please select a classroom');
      return;
    }
    if (!summary.trim()) {
      Alert.alert('Validation Error', 'Quiz summary is required');
      return;
    }
    if (startTime >= endTime) {
      Alert.alert('Validation Error', 'End date must be after start date');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!quiz || !Array.isArray(quiz) || quiz.length === 0) {
        Alert.alert('Validation Error', 'No assessment questions found');
        setIsSubmitting(false);
        return;
      }

      // Transform quiz array to expected format
      const quizzes = quiz.map((q: any) => {
        const question = q.question || q.question_text;
        const options = q.options || [];
        const correctAnswer = q.correctAnswer || q.correct_answer || q.answer;
        const explanation = q.explanation || null;

        return {
          quiz: {
            question,
            options,
            answer: correctAnswer,
            explanation,
          },
          answer: correctAnswer,
        };
      });

      const trimmedSummary = summary.trim();
      const finalSummary = trimmedSummary.length > 500 
        ? trimmedSummary.substring(0, 497) + '...' 
        : trimmedSummary;

      const shareData = {
        topic: topic.trim(),
        file_name: fileName,
        classroom_id: selectedClassroom || null,
        instructor_id: user.id,
        instructor_name: user.name || user.username || 'Instructor',
        quiz_id: null,
        createdby: user.name || user.username || 'Instructor',
        student_level: studentLevel,
        session_id: quizData?.thread_slug || `session_${Date.now()}`,
        questions: { quizzes },
        status: status,
        tags: { subject: subject, difficulty: difficulty },
        question_count: quiz.length || 0,
        duration: parseInt(duration) || 30,
        summary: finalSummary,
        type: 'multiple_choice',
        is_public: isPublic,
        is_timer: isTimer,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        has_time_limit: isTimer,
      };

      const response = await apiClient.post('/api/v1/sharequiz', shareData);
      const responseData = response.data;

      // Step 2 & 3: Only create assignments and classroom quizzes if classroom is selected
      if (responseData.quiz_id && responseData.classroom_id) {
        try {
          // Step 2: Create quiz assignment using response data
          const assignmentData = {
            quiz_id: responseData.quiz_id,
            class_id: responseData.classroom_id,
            assigned_by: responseData.instructor_id || user.id,
            assigned_at: responseData.assigned_at || new Date().toISOString(),
            due_date: responseData.due_date || endTime.toISOString(),
            is_active: true
          };

          //console.log('Creating quiz assignment:', JSON.stringify(assignmentData, null, 2));
          await createQuizAssignment(assignmentData);

          // Step 3: Create classroom Assessment entry using response data
          const classroomQuizData = {
            quiz_id: responseData.quiz_id,
            classroom_id: responseData.classroom_id,
            instructor_id: responseData.instructor_id || user.id,
            topic: responseData.topic || topic.trim(),
            date_created: new Date().toISOString(),
            is_active: true
          };

          console.log('Creating classroom quiz:', JSON.stringify(classroomQuizData, null, 2));
          await createClassroomQuiz(classroomQuizData);

          // Step 4: Send notifications to students in the classroom
        //   try {
        //     console.log('Fetching classroom students for notifications...');
        //     const studentIds = await getClassroomStudents(responseData.classroom_id);
            
        //     if (studentIds.length > 0) {
        //       console.log(`Sending notifications to ${studentIds.length} students`);
              
        //       // Send in-app notifications
        //       await createQuizAssignmentNotification({
        //         quiz_id: responseData.quiz_id,
        //         classroom_id: responseData.classroom_id,
        //         topic: responseData.topic || topic.trim(),
        //         instructor_name: user.name || user.username || 'Instructor',
        //         due_date: endTime.toISOString(),
        //         student_ids: studentIds,
        //       });
        //       console.log('Quiz assignment notifications sent successfully');
              
        //       // Send push notifications
        //       try {
        //         await sendQuizNotification({
        //           studentIds: studentIds,
        //           quizTitle: responseData.topic || topic.trim(),
        //           teacherName: user.name || user.username || 'Instructor',
        //           quizId: responseData.quiz_id,
        //           sessionId: responseData.session_id,
        //         });
        //         console.log('Push notifications sent successfully');
        //       } catch (pushError) {
        //         console.error('Error sending push notifications (non-critical):', pushError);
        //       }
        //     } else {
        //       console.log('No students found in classroom for notifications');
        //     }
        //   } catch (notifError) {
        //     console.error('Error sending quiz assignment notifications (non-critical):', notifError);
        //     // Don't fail the entire process if notification fails
        //   }

          // Step 5: Send WhatsApp messages to students
          // try {
          //   console.log('Fetching classroom students for WhatsApp notifications...');
          //   const studentsWithPhones = await getClassroomStudentsWithPhones(responseData.classroom_id);
            
          //   if (studentsWithPhones.length > 0) {
          //     console.log(`Sending WhatsApp messages to ${studentsWithPhones.length} students`);
              
          //     const classroomName = classrooms.find(c => c.class_id === responseData.classroom_id)?.name;
              
          //     const whatsappResult = await sendQuizAssignmentWhatsApp({
          //       students: studentsWithPhones,
          //       quizTopic: responseData.topic || topic.trim(),
          //       instructorName: user.name || user.username || 'Instructor',
          //       classroomName: classroomName,
          //       dueDate: endTime.toISOString(),
          //       duration: parseInt(duration) || 30,
          //     });
              
          //     console.log(`WhatsApp messages sent: ${whatsappResult.success} successful, ${whatsappResult.failed} failed`);
              
          //     // Show user feedback about WhatsApp messages (optional)
          //     if (whatsappResult.success > 0) {
          //       // You could show a toast or alert here if desired
          //       console.log(`✅ WhatsApp notifications sent to ${whatsappResult.success} students`);
          //     }
          //   } else {
          //     console.log('No students found in classroom for WhatsApp notifications');
          //   }
          // } catch (whatsappError) {
          //   console.error('Error sending WhatsApp notifications (non-critical):', whatsappError);
          //   // Don't fail the entire process if WhatsApp fails
          // }

          // Step 6: Send Push Notifications to Students
          try {
            console.log('📤 Sending push notifications to classroom students...');
            
            
            // Get the classroom to find student IDs
            let classroom = classrooms.find(c => c.classroom_id === classroomQuizData.classroom_id);
            console.log('🎯 Selected classroom:', {
              found: !!classroom,
              classroom_id: classroom?.classroom_id,
              classroom_name: classroom?.classroom_name,
              total_count: classroom?.total_count,
              has_students_array: !!classroom?.students,
              students_length: classroom?.students?.length || 0
            });
            
            // If classroom found but no students array, fetch fresh data
            if (classroom && (!classroom.students || classroom.students.length === 0)) {
              console.log('⚠️ No students in cached classroom, fetching fresh data...');
              try {
                const token = await getAccessToken();
                if (token) {
                  const freshResponse = await fetch(
                    `${API_BASE_URL}/api/v1/dashboard/quizzes?view_type=class_wise_students&classroom_id=${responseData.classroom_id}`,
                    {
                      method: 'GET',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                    }
                  );
                  
                  if (freshResponse.ok) {
                    const freshData = await freshResponse.json();
                    console.log('📥 Fresh classroom data:', JSON.stringify(freshData, null, 2));
                    
                    // Extract and parse classroom with students from response
                    if (freshData.data && freshData.data.length > 0) {
                      const rawClassroom = freshData.data[0];
                      
                      // Parse the attempts field which contains student data as JSON string
                      let students: any[] = [];
                      if (rawClassroom.attempts) {
                        try {
                          const parsedAttempts = typeof rawClassroom.attempts === 'string' 
                            ? JSON.parse(rawClassroom.attempts) 
                            : rawClassroom.attempts;
                          
                          // Map student data to consistent format
                          students = parsedAttempts.map((student: any) => ({
                            id: student.student_id,
                            user_id: student.student_id,
                            student_id: student.student_id,
                            fullname: student.student_fullname,
                            username: student.student_username,
                            email: student.email,
                            phone: student.phone,
                            status: student.status,
                          }));
                          
                          console.log('✅ Parsed students from fresh data:', students.length);
                        } catch (parseError) {
                          console.error('❌ Failed to parse attempts:', parseError);
                        }
                      }
                      
                      classroom = {
                        classroom_id: rawClassroom.classroom_id,
                        classroom_name: rawClassroom.classroom_name,
                        total_count: rawClassroom.total_count || students.length,
                        students: students,
                      };
                      
                      console.log('✅ Updated classroom with fresh data:', {
                        total_count: classroom?.total_count,
                        students_length: classroom?.students?.length || 0
                      });
                    }
                  }
                }
              } catch (fetchError) {
                console.error('⚠️ Failed to fetch fresh classroom data:', fetchError);
              }
            }
            
            if (classroom && classroom.students && classroom.students.length > 0) {
              console.log('👥 Processing students:', classroom.students);
              
              // Extract student IDs from classroom
              const studentIds = classroom.students.map((student: any) => student.id || student.user_id).filter(Boolean);
              
              if (studentIds.length > 0) {
                console.log(`✅ Sending push notifications to ${studentIds.length} students: ${studentIds.join(', ')}`);
                
                // Get auth token
                const token = await getAccessToken();
                
                if (token) {
                  // const classroomName = classroom.classroom_name;
                  const instructorName = user.name || user.username || 'Instructor';
                  
                  // Prepare notification payload
                  const notificationPayload = {
                    user_ids: studentIds,
                    title: `📚 New Quiz: ${responseData.topic || topic.trim()}`,
                    body: `Quiz Alert! ${instructorName} teacher has scheduled a quiz on ${topic} at ${startTime}. Good Luck! Tap to start!`,
                    priority: 'high',
                    data: {
                      type: 'QUIZ_ASSIGNED',
                      quiz_id: String(responseData.quiz_id),
                      classroom_id: responseData.classroom_id,
                      session_id: responseData.session_id,
                      screen: 'QuizTakingScreen',
                      quizId: String(responseData.quiz_id),
                      sessionId: responseData.session_id,
                      classroomId: responseData.classroom_id,
                      click_action: `https://app.eduvijna.com/openquiz?session_id=${responseData.session_id}`
                    },
                  };
                  
                  console.log('📤 Notification payload:', JSON.stringify(notificationPayload, null, 2));
                  
                  // Send push notification via backend API
                  const notificationResponse = await fetch(`${API_BASE_URL}/api/notifications/send`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(notificationPayload),
                  });
                  
                  console.log('📨 Notification response status:', notificationResponse.status);
                  
                  if (notificationResponse.ok) {
                    const responseJson = await notificationResponse.json();
                    console.log('✅ Push notifications sent successfully:', responseJson);
                  } else {
                    const errorText = await notificationResponse.text();
                    console.error('⚠️ Push notification failed:', notificationResponse.status, errorText);
                  }
                } else {
                  console.warn('⚠️ No auth token available for push notifications');
                }
              } else {
                console.warn('⚠️ No valid student IDs found in classroom - students array:', classroom.students);
              }
            } else {
              console.warn('⚠️ No students found in classroom for push notifications', {
                classroom_exists: !!classroom,
                classroom_id: responseData.classroom_id,
                total_classrooms: classrooms.length,
                classroom_ids: classrooms.map(c => c.classroom_id)
              });
            }
          } catch (pushError) {
            console.error('⚠️ Error sending push notifications (non-critical):', pushError);
            // Don't fail the entire process if push notification fails
          }
        } catch (assignmentError) {
          console.error('Error creating assignments/classroom-quizzes (non-critical):', assignmentError);
          // Don't fail the entire process if these optional steps fail
        }
      }

      // Generate share URL
      const sessionId = responseData.session_id || quizData?.thread_slug;
      const baseUrl = 'https://app.eduvijna.com';
      const quizUrl = sessionId 
        ? `${baseUrl}/openquiz?session_id=${sessionId}`
        : `${baseUrl}/quiz/${responseData.quiz_id}`;

      if (onShareSuccess) {
        onShareSuccess(quizUrl);
      }
      onClose();
      
      // Show appropriate success message based on whether classroom was selected
      const successMessage = responseData.classroom_id 
        ? 'Quiz shared successfully! Push notifications sent to students.'
        : 'Quiz shared successfully!';
      
      Alert.alert('Success', successMessage);
    } catch (error: any) {
      console.error('Share Assessment error:', error);
      const errorMessage = error.response?.data?.detail 
        || error.response?.data?.message 
        || error.message 
        || 'Failed to Share Assessment. Please try again.';
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} onRequestClose={onClose} {...getFullScreenModalProps('fade')}>
      <View style={[fullScreenModalOverlay, styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.55)' }]}>
        <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>🔗 Share Assessment</Text>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.surface }]}>
              <Text style={[styles.closeButtonText, { color: colors.text }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Quiz Topic (Read-only)</Text>
              <TextInput style={[styles.input, styles.inputDisabled, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]} value={topic} editable={false} />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>File Name (Auto-generated)</Text>
              <TextInput style={[styles.input, styles.inputDisabled, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]} value={fileName} editable={false} />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Classroom {!isPublic && <Text style={styles.required}>*</Text>}</Text>
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>{isPublic ? 'Optional - select to send push notifications to students' : 'Required for private quizzes'}</Text>
              <ModalDropdownField
                label="Classroom"
                hideLabel
                value={selectedClassroom}
                onChange={setSelectedClassroom}
                items={classrooms.map((c) => ({ id: c.classroom_id, name: c.classroom_name }))}
                placeholder={
                  user?.role === 'student'
                    ? 'Not available for students'
                    : isPublic
                      ? 'Select a classroom (Optional)'
                      : 'Select a classroom (Required)'
                }
                disabled={user?.role === 'student'}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Student Level</Text>
              <View style={styles.radioGroup}>
                {[
                  {key: 'elementary', label: 'Elementary'},
                  {key: 'middle_school', label: 'Middle School'},
                  {key: 'pre_medical', label: 'Pre-Medical'},
                  {key: 'pre_engineering', label: 'Pre-Engineering'},
                  {key: 'pre_arts', label: 'Pre-Arts'},
                ].map((level) => (
                  <TouchableOpacity key={level.key} style={[styles.radioOption, { backgroundColor: colors.surface }]} onPress={() => setStudentLevel(level.key)}>
                    <View style={[styles.radioCircle, { borderColor: colors.primary }]}>
                      {studentLevel === level.key && <View style={[styles.radioCircleSelected, { backgroundColor: colors.primary }]} />}
                    </View>
                    <Text style={[styles.radioLabel, { color: colors.text }]}>{level.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Subject <Text style={styles.required}>*</Text></Text>
              <ModalDropdownField
                label="Subject"
                hideLabel
                value={subject}
                onChange={setSubject}
                items={SHARE_SUBJECT_OPTIONS}
                placeholder="Select subject..."
                required
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Difficulty Level <Text style={styles.required}>*</Text></Text>
              <View style={styles.radioGroup}>
                {[
                  {key: 'beginner', label: 'Beginner'},
                  {key: 'elementary', label: 'Elementary'},
                  {key: 'intermediate', label: 'Intermediate'},
                  {key: 'upper_intermediate', label: 'Upper Intermediate'},
                  {key: 'advanced', label: 'Advanced'},
                  {key: 'expert', label: 'Expert'},
                  {key: 'master', label: 'Master'},
                ].map((level) => (
                  <TouchableOpacity key={level.key} style={[styles.radioOption, { backgroundColor: colors.surface }]} onPress={() => setDifficulty(level.key)}>
                    <View style={[styles.radioCircle, { borderColor: colors.primary }]}>
                      {difficulty === level.key && <View style={[styles.radioCircleSelected, { backgroundColor: colors.primary }]} />}
                    </View>
                    <Text style={[styles.radioLabel, { color: colors.text }]}>{level.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Quiz Settings</Text>
              <TouchableOpacity 
                style={styles.checkboxOption} 
                onPress={() => user?.role !== 'student' && setIsPublic(!isPublic)}
                disabled={user?.role === 'student'}
              >
                <View style={[styles.checkbox, { borderColor: colors.primary }]}>
                  {isPublic && <Text style={[styles.checkboxCheck, { color: colors.primary }]}>✓</Text>}
                </View>
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>Public Quiz</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Duration (minutes) <Text style={styles.required}>*</Text></Text>
              <ModalDropdownField
                label="Duration"
                hideLabel
                value={duration}
                onChange={setDuration}
                items={SHARE_DURATION_OPTIONS}
                placeholder="Select duration..."
                required
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>📅 Quiz Time Window <Text style={styles.required}>*</Text></Text>
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>Students can only take the quiz during this time period</Text>
              
              <View style={styles.dateTimeRow}>
                <Text style={[styles.dateTimeLabel, { color: colors.text }]}>🟢 Start:</Text>
                <TouchableOpacity 
                  style={[styles.dateTimeButton, { backgroundColor: colors.surface, borderColor: colors.border }]} 
                  onPress={() => { setStartPickerMode('date'); setShowStartPicker(true); }}
                >
                  <Text style={[styles.dateTimeText, { color: colors.text }]}>📅 {startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.dateTimeButton, { backgroundColor: colors.surface, borderColor: colors.border }]} 
                  onPress={() => { setStartPickerMode('time'); setShowStartPicker(true); }}
                >
                  <Text style={[styles.dateTimeText, { color: colors.text }]}>🕐 {startTime.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', hour12: true})}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dateTimeRow}>
                <Text style={[styles.dateTimeLabel, { color: colors.text }]}>🔴 End:</Text>
                <TouchableOpacity 
                  style={[styles.dateTimeButton, { backgroundColor: colors.surface, borderColor: colors.border }]} 
                  onPress={() => { setEndPickerMode('date'); setShowEndPicker(true); }}
                >
                  <Text style={[styles.dateTimeText, { color: colors.text }]}>📅 {endTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.dateTimeButton, { backgroundColor: colors.surface, borderColor: colors.border }]} 
                  onPress={() => { setEndPickerMode('time'); setShowEndPicker(true); }}
                >
                  <Text style={[styles.dateTimeText, { color: colors.text }]}>🕐 {endTime.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', hour12: true})}</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.timeWindowSummary, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
                <Text style={[styles.timeWindowTitle, { color: colors.primary }]}>📊 Quiz Window Summary:</Text>
                <Text style={[styles.timeWindowText, { color: colors.text }]}>Duration: {Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60))} hours ({Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24))} days)</Text>
                <Text style={[styles.timeWindowText, { color: colors.text }]}>From: {startTime.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</Text>
                <Text style={[styles.timeWindowText, { color: colors.text }]}>To: {endTime.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Question Count (Read-only)</Text>
              <TextInput 
                style={[styles.input, styles.inputDisabled, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]} 
                value={String(quizMetadata?.question_count || quizData?.questionsCount || quiz.length)} 
                editable={false} 
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Additional Instructions <Text style={styles.required}>*</Text></Text>
              <TextInput 
                style={[styles.input, styles.textArea, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]} 
                value={summary} 
                onChangeText={(text) => { if (text.length <= 500) setSummary(text); }} 
                placeholder="Enter additional instructions" 
                placeholderTextColor={colors.textSecondary}
                multiline 
                numberOfLines={4} 
                maxLength={500} 
              />
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>{summary.length}/500 characters</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Status</Text>
              <ModalDropdownField
                label="Status"
                hideLabel
                value={status}
                onChange={setStatus}
                items={SHARE_STATUS_OPTIONS}
                placeholder="Select status..."
              />
            </View>
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={[styles.cancelButton, { borderColor: colors.border }]} onPress={onClose} disabled={isSubmitting}>
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.shareButton, { backgroundColor: colors.primary }]} onPress={handleShare} disabled={isSubmitting}>
              <Text style={styles.shareButtonText}>{isSubmitting ? 'Sharing...' : 'Share'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Start Date/Time Picker Modal */}
        {showStartPicker && (
          <Modal
            visible={showStartPicker}
            onRequestClose={() => setShowStartPicker(false)}
            {...getFullScreenModalProps('fade')}
          >
            <View style={[fullScreenModalOverlay, styles.datePickerOverlay]}>
              <View style={[styles.datePickerContainer, { backgroundColor: colors.card }]}>
                <View style={[styles.datePickerHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.datePickerTitle, { color: colors.text }]}>
                    {startPickerMode === 'date' ? '📅 Select Start Date' : '🕐 Select Start Time'}
                  </Text>
                </View>
                
                <View style={styles.datePickerContent}>
                  <DateTimePicker 
                    value={startTime} 
                    mode={startPickerMode} 
                    is24Hour={false} 
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event: any, selectedDate: any) => {
                      if (Platform.OS === 'android') {
                        setShowStartPicker(false);
                        if (event.type === 'set' && selectedDate) {
                          setStartTime(selectedDate);
                        }
                      } else {
                        if (selectedDate) {
                          setStartTime(selectedDate);
                        }
                      }
                    }}
                  />
                </View>

                {Platform.OS === 'ios' && (
                  <View style={[styles.datePickerFooter, { borderTopColor: colors.border }]}>
                    <TouchableOpacity 
                      style={[styles.datePickerButton, { backgroundColor: colors.primary }]} 
                      onPress={() => setShowStartPicker(false)}
                    >
                      <Text style={styles.datePickerButtonText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </Modal>
        )}

        {/* End Date/Time Picker Modal */}
        {showEndPicker && (
          <Modal
            visible={showEndPicker}
            onRequestClose={() => setShowEndPicker(false)}
            {...getFullScreenModalProps('fade')}
          >
            <View style={[fullScreenModalOverlay, styles.datePickerOverlay]}>
              <View style={[styles.datePickerContainer, { backgroundColor: colors.card }]}>
                <View style={[styles.datePickerHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.datePickerTitle, { color: colors.text }]}>
                    {endPickerMode === 'date' ? '📅 Select End Date' : '🕐 Select End Time'}
                  </Text>
                </View>
                
                <View style={styles.datePickerContent}>
                  <DateTimePicker 
                    value={endTime} 
                    mode={endPickerMode} 
                    is24Hour={false} 
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event: any, selectedDate: any) => {
                      if (Platform.OS === 'android') {
                        setShowEndPicker(false);
                        if (event.type === 'set' && selectedDate) {
                          setEndTime(selectedDate);
                        }
                      } else {
                        if (selectedDate) {
                          setEndTime(selectedDate);
                        }
                      }
                    }}
                    minimumDate={startTime}
                  />
                </View>

                {Platform.OS === 'ios' && (
                  <View style={[styles.datePickerFooter, { borderTopColor: colors.border }]}>
                    <TouchableOpacity 
                      style={[styles.datePickerButton, { backgroundColor: colors.primary }]} 
                      onPress={() => setShowEndPicker(false)}
                    >
                      <Text style={styles.datePickerButtonText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { justifyContent: 'center', alignItems: 'center' },
  modalContainer: {width: '90%', maxHeight: '85%', borderRadius: 16, overflow: 'hidden'},
  modalHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1},
  modalTitle: {fontSize: 20, fontWeight: '700'},
  closeButton: {width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center'},
  closeButtonText: {fontSize: 20},
  modalContent: {padding: 20},
  formGroup: {marginBottom: 20},
  label: {fontSize: 14, fontWeight: '600', marginBottom: 8},
  required: {color: '#F44336', fontWeight: '700'},
  helperText: {fontSize: 12, marginTop: 4},
  input: {borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16},
  inputDisabled: {opacity: 0.6},
  textArea: {minHeight: 100, textAlignVertical: 'top'},
  radioGroup: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  radioOption: {flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, minWidth: 120},
  radioCircle: {width: 20, height: 20, borderRadius: 10, borderWidth: 2, marginRight: 8, justifyContent: 'center', alignItems: 'center'},
  radioCircleSelected: {width: 10, height: 10, borderRadius: 5},
  radioLabel: {fontSize: 14},
  checkboxOption: {flexDirection: 'row', alignItems: 'center', paddingVertical: 8, marginBottom: 8},
  checkbox: {width: 20, height: 20, borderRadius: 4, borderWidth: 2, marginRight: 8, justifyContent: 'center', alignItems: 'center'},
  checkboxCheck: {fontSize: 14, fontWeight: '700'},
  checkboxLabel: {fontSize: 14, flex: 1},
  timeWindowSummary: {marginTop: 12, padding: 12, borderRadius: 8, borderLeftWidth: 4},
  timeWindowTitle: {fontSize: 14, fontWeight: '600', marginBottom: 4},
  timeWindowText: {fontSize: 12, marginBottom: 2},
  dateTimeRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8},
  dateTimeLabel: {fontSize: 14, fontWeight: '600', width: 70},
  dateTimeButton: {flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, alignItems: 'center'},
  dateTimeText: {fontSize: 14, fontWeight: '500'},
  modalFooter: {flexDirection: 'row', padding: 16, gap: 6, borderTopWidth: 1},
  cancelButton: {flex: 1, paddingVertical: 14, borderRadius: 8, borderWidth: 2, alignItems: 'center'},
  cancelButtonText: {fontSize: 16, fontWeight: '600'},
  shareButton: {flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center'},
  shareButtonText: {fontSize: 16, fontWeight: '600', color: '#fff'},
  // Date Picker Modal Styles
  datePickerOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerContainer: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  datePickerHeader: {
    padding: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  datePickerContent: {
    padding: 16,
    alignItems: 'center',
  },
  datePickerFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
  datePickerButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  datePickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ShareQuizModal;
