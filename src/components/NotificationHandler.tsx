/**
 * Global Notification Handler
 * Handles notification clicks and navigates to appropriate screens
 * API-based notifications (backend uses Firebase Admin SDK)
 */

import { useEffect, useRef } from 'react';
import { buildQuizGradedResultsNavigationParams } from '@core/services/notificationNavigation';
import { executeStudentAssignedQuizViewResults } from '@core/services/assessmentQuizStart.service';
import { resolveStudentGradedAssignmentSession } from '@core/services/gradedNotificationRouting.service';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
//import type { Notification } from '@core/api/notifications.api';
import useNotifications from '@core/hooks/useNotifications';
import { useAuth } from '@core/hooks/useAuth';

type RootNavigate = { navigate: (screen: string, params?: unknown) => void };

export default function NotificationHandler() {
  const navigation = useNavigation();
  const navigationRef = useRef<RootNavigate | null>(null);
  const { fetchNotifications } = useNotifications();
  const { user } = useAuth();

  // Only set up handlers if user is logged in
  useEffect(() => {
    if (!user) return;
  }, [user]);

  // Update ref when navigation changes
  useEffect(() => {
    navigationRef.current = navigation as unknown as RootNavigate;
  }, [navigation]);

  const navigateRoot = (screen: string, params?: unknown) => {
    navigationRef.current?.navigate(screen, params);
  };

  // Handle foreground notifications (display local notification)
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('🔔 [Foreground] Notification received:', notification);
      
      // Refresh notifications list from backend
      // fetchNotifications(); // Commented out to prevent rate limit errors
    });

    return () => subscription.remove();
  }, [fetchNotifications]);

  // Handle notification clicks (background/foreground)
  // DISABLED: Notification handling is done in App.tsx to prevent duplicate navigation
  // useEffect(() => {
  //   const subscription = Notifications.addNotificationResponseReceivedListener(response => {
  //     console.log('🔔 [Click] Notification tapped:', response);
  //     handleNotificationTap(response.notification);
  //   });

  //   // Handle notification that opened the app (when app was closed)
  //   Notifications.getLastNotificationResponseAsync().then(response => {
  //     if (response) {
  //       console.log('🔔 [Open] App opened from notification:', response);
  //       handleNotificationTap(response.notification);
  //     }
  //   });

  //   return () => subscription.remove();
  // }, []);

  /**
   * Handle notification tap
   */
  const handleNotificationTap = (notification: Notifications.Notification) => {
    const data = notification.request.content.data;
    console.log('📱 Handling notification tap:', {
      title: notification.request.content.title,
      data,
    });

    navigateFromNotification(data);
  };

  /**
   * Parse notification data and navigate to appropriate screen
   */
  const navigateFromNotification = (data: any) => {
    console.log('📱 Handling notification data:', data);

    // Extract navigation parameters (support both snake_case and camelCase)
    const type = data?.type;
    const quizId = data?.quiz_id || data?.quizId;
    const sessionId = data?.session_id || data?.sessionId;
    const quizTitle = data?.quiz_title || data?.quizTitle;
    //const classroomId = data?.classroom_id || data?.classroomId;
    //const assignmentId = data?.assignment_id || data?.assignmentId;
    const studentId = data?.student_id || data?.studentId;
    //const navScreen = data?.screen || data?.navScreen;


    // Navigate based on notification type
    switch (type) {
      case 'new_quiz':
      case 'quiz_assigned':
        // New quiz assigned - show quiz preview/ready to start screen
        if (quizId) {
          console.log('➡️ Navigating to Quiz Ready to Start:', quizId);
          navigateRoot('QuizPreviewScreen', {
            quizId,
            sessionId,
            quizTitle,
          });
        }
        break;

      case 'quiz_graded': {
        void (async () => {
          let resolvedSessionId = sessionId;
          let resolvedClassroomId =
            (data?.classroom_id as string | undefined) || (data?.classroomId as string | undefined);
          const student = studentId ?? user?.id;
          if (!resolvedSessionId && quizId && student) {
            const resolution = await resolveStudentGradedAssignmentSession(String(student), quizId);
            if (resolution.kind === 'ambiguous') {
              console.log('➡️ Ambiguous graded quiz assignment; opening Assessments');
              navigateRoot('Assessments');
              return;
            }
            if (resolution.kind === 'resolved') {
              resolvedSessionId = resolution.sessionId;
              resolvedClassroomId = resolution.classroomId;
            }
          }
          const resultParams = buildQuizGradedResultsNavigationParams({
            quiz_id: quizId,
            session_id: resolvedSessionId,
            student_id: student,
            quiz_title: quizTitle,
          });
          if (!resultParams || !resolvedSessionId || quizId == null || !student) {
            console.log('➡️ Graded notification missing resolvable quiz; opening Assessments');
            navigateRoot('Assessments');
            return;
          }
          if (!resolvedClassroomId) {
            navigateRoot('Assessments');
            return;
          }
          await executeStudentAssignedQuizViewResults(
            {
              studentId: String(student),
              quizId,
              sessionId: String(resolvedSessionId),
              classroomId: String(resolvedClassroomId),
              quizName: typeof resultParams.quizName === 'string' ? resultParams.quizName : quizTitle,
            },
            {
              navigation: navigationRef.current as { navigate: (screen: string, params?: unknown) => void },
            },
          );
        })();
        break;
      }

      case 'classroom_invite':
        // Classroom invitation - navigate to classes (could add classroom detail screen)
        console.log('➡️ Navigating to ClassesList');
        navigateRoot('ClassesList');
        break;

      case 'announcement':
        // General announcement - navigate to notifications screen
        console.log('➡️ Navigating to Notifications');
        navigateRoot('Notifications');
        break;

      case 'general':
      default:
        // For general notifications or unknown types
        if (quizId) {
          // If there's a quiz ID, try to navigate to it
          const navScreen = user?.role === 'student' ? 'QuizTakingScreen' : 'QuizPreviewScreen';
          console.log(`➡️ Navigating to ${navScreen} (general):`, quizId);

          navigateRoot(navScreen, {
            quizId,
            sessionId,
          });
        } else {
          // Otherwise, go to notifications screen
          console.log('➡️ Navigating to Notifications (general)');
          navigateRoot('Notifications');
        }
        break;
    }
  };

  // This component doesn't render anything
  return null;
}
