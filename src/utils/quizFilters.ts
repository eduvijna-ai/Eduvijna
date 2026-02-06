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
  // Must be pending status
  if (quiz.status !== 'pending') {
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
 * Filter quizzes to get only active ones for students
 * @param quizzes Array of quiz objects
 * @returns Filtered array of active quizzes
 */
export const filterActiveQuizzes = (quizzes: any[]): any[] => {
  return quizzes.filter(isStudentQuizActive);
};

/**
 * Filter quizzes to get only upcoming ones for students
 * @param quizzes Array of quiz objects
 * @returns Filtered array of upcoming quizzes
 */
export const filterUpcomingQuizzes = (quizzes: any[]): any[] => {
  return quizzes.filter(isStudentQuizUpcoming);
};

/**
 * Filter quizzes to get only completed ones for students
 * @param quizzes Array of quiz objects
 * @returns Filtered array of completed quizzes
 */
export const filterCompletedQuizzes = (quizzes: any[]): any[] => {
  return quizzes.filter(q => q.status === 'completed');
};

/**
 * Filter quizzes to get only missed ones for students
 * @param quizzes Array of quiz objects
 * @returns Filtered array of missed quizzes
 */
export const filterMissedQuizzes = (quizzes: any[]): any[] => {
  return quizzes.filter(q => q.status === 'missed');
};

/**
 * Filter quizzes to get only pending ones for students
 * Pending = pending status + active availability + within time window
 * @param quizzes Array of quiz objects
 * @returns Filtered array of pending quizzes
 */
export const filterPendingQuizzes = (quizzes: any[]): any[] => {
  return quizzes.filter(quiz => 
    quiz.status === 'pending' && 
    quiz.availability_status === 'active' && 
    !isQuizUpcoming(quiz) && // Exclude upcoming quizzes
    isQuizWithinTimeWindow(quiz)
  );
};
