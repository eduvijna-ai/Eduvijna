/**
 * Common quiz filtering utilities
 * Used across multiple screens to maintain consistent time-window and status logic
 */

/**
 * Check if a quiz is within its active time window
 * @param quiz Quiz object with start_time and end_time
 * @returns true if quiz is currently active (started but not ended)
 */
export const isQuizWithinTimeWindow = (quiz: any): boolean => {
  const startTime = quiz.start_time;
  const endTime = quiz.end_time;
  
  // If no time constraints, consider it within window
  if (!startTime && !endTime) {
    return true;
  }
  
  const now = new Date();
  
  // Quiz must have started
  if (startTime && now < new Date(startTime)) {
    return false; // Not started yet
  }
  
  // Quiz must not have ended
  if (endTime && now > new Date(endTime)) {
    return false; // Already ended
  }
  
  return true;
};

/**
 * Check if a quiz is upcoming (not started yet)
 * @param quiz Quiz object with start_time
 * @returns true if quiz hasn't started yet
 */
export const isQuizUpcoming = (quiz: any): boolean => {
  const startTime = quiz.start_time;
  
  if (!startTime) {
    return false; // No start time means not upcoming
  }
  
  const now = new Date();
  return now < new Date(startTime);
};

/**
 * Check if a quiz is expired (ended)
 * @param quiz Quiz object with end_time
 * @returns true if quiz has ended
 */
export const isQuizExpired = (quiz: any): boolean => {
  const endTime = quiz.end_time;
  
  if (!endTime) {
    return false; // No end time means not expired
  }
  
  const now = new Date();
  return now > new Date(endTime);
};

/**
 * Check if a quiz is active for students
 * Active = pending status + availability_status='active' + within time window
 * @param quiz Quiz object with status, availability_status, start_time, end_time
 * @returns true if quiz is active and available for students
 */
export const isStudentQuizActive = (quiz: any): boolean => {
  // Must be pending or in-progress (started) status
  // 'started' means the student opened the quiz but hasn't submitted yet—
  // it should still appear as actionable in the pending list.
  if (
    quiz.status !== 'pending' &&
    quiz.status !== 'started' &&
    quiz.status !== 'in_progress'
  ) {
    return false;
  }
  
  // Must have active availability status
  if (quiz.availability_status !== 'active') {
    return false;
  }
  
  // Must be within time window
  return isQuizWithinTimeWindow(quiz);
};

/**
 * Check if a quiz is upcoming for students
 * Upcoming = pending status + not started yet
 * @param quiz Quiz object with status, start_time
 * @returns true if quiz is upcoming for students
 */
export const isStudentQuizUpcoming = (quiz: any): boolean => {
  // Must be pending status
  if (quiz.status !== 'pending') {
    return false;
  }
  
  // Must not have started yet
  return isQuizUpcoming(quiz);
};

/**
 * TEACHER FILTERS - Based on availability_status only
 */

/**
 * Filter quizzes to get active ones for teachers
 * @param quizzes Array of quiz objects
 * @returns Filtered array of active quizzes (availability_status = 'active')
 */
export const filterActiveQuizzes = (quizzes: any[]): any[] => {
  return quizzes.filter(quiz => quiz.availability_status === 'active');
};

/**
 * Filter quizzes to get available soon quizzes for teachers
 * @param quizzes Array of quiz objects
 * @returns Filtered array of available soon quizzes (availability_status = 'coming soon')
 */
export const filterAvailableSoonQuizzes = (quizzes: any[]): any[] => {
  return quizzes.filter(quiz => quiz.availability_status === 'coming soon');
};

/**
 * Filter quizzes to get expired quizzes for teachers
 * @param quizzes Array of quiz objects
 * @returns Filtered array of expired quizzes (availability_status = 'expired')
 */
export const filterExpiredQuizzes = (quizzes: any[]): any[] => {
  return quizzes.filter(quiz => quiz.availability_status === 'expired');
};

/**
 * STUDENT FILTERS - Based on availability_status AND status
 */

/**
 * Filter quizzes to get upcoming ones for students
 * @param quizzes Array of quiz objects
 * @returns Filtered array of upcoming quizzes (availability_status = 'coming soon' AND status = 'pending')
 */
export const filterUpcomingQuizzes = (quizzes: any[]): any[] => {
  return quizzes.filter(quiz => 
    quiz.availability_status === 'coming soon' && quiz.status === 'pending'
  );
};

/**
 * Filter quizzes to get ongoing ones for students (pending quizzes)
 * @param quizzes Array of quiz objects
 * @returns Filtered array of ongoing quizzes (availability_status = 'active' AND status = 'pending')
 */
export const filterPendingQuizzes = (quizzes: any[]): any[] => {
  return quizzes.filter(quiz => 
    quiz.availability_status === 'active' && quiz.status === 'pending'
  );
};

/**
 * Filter quizzes to get completed ones for students
 * @param quizzes Array of quiz objects
 * @returns Filtered array of completed quizzes (availability_status = 'active' AND status = 'completed')
 */
export const filterCompletedQuizzes = (quizzes: any[]): any[] => {
  return quizzes.filter(quiz => 
    quiz.availability_status === 'active' && quiz.status === 'completed'
  );
};

/**
 * Filter quizzes to get missed ones for students
 * @param quizzes Array of quiz objects
 * @returns Filtered array of missed quizzes (availability_status = 'expired' AND status = 'pending')
 */
export const filterMissedQuizzes = (quizzes: any[]): any[] => {
  return quizzes.filter(quiz => 
    quiz.availability_status === 'expired' && quiz.status === 'pending'
  );
};
