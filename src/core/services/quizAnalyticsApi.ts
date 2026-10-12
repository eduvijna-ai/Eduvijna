/**
 * Quiz Analytics API Service (ported from Quiz-React)
 * Handles API calls for quiz analytics dashboard
 */

import { apiClient } from '../api/config';
import type {
  QuizListResponse,
  QuizListParams,
  ClassOverview,
  StatusSummary,
  StudentPerformanceRow,
  QuizPerformanceRow,
  ParsedLogData,
  QuizListItem,
  AcademicKPIs,
  EngagementKPIs,
  TeachingEffectivenessKPIs,
  StudentHealthKPIs,
  SchoolOverviewKPIs,
  DynamicInsight,
  QuizTile,
} from '../types/quizAnalytics.types';
import { API_VIEW_TYPES } from '../types/quizAnalytics.types';

/**
 * Fetch quiz analytics data
 * 
 * IMPORTANT: view_type is MANDATORY as of the upgraded API.
 * Allowed values: 'summary', 'missed', 'attempts', 'all_students', 'classes'
 * 
 * Conditional parameter requirements:
 * - For class-based data: pass classroom_id along with view_type
 * - For quiz-based data: pass quiz_id along with view_type
 */
export const getQuizAnalytics = async (params: QuizListParams): Promise<QuizListResponse> => {
  // Validate mandatory view_type parameter
  if (!params.view_type) {
    throw new Error('view_type is mandatory for /api/v1/dashboard/quizzes API calls');
  }
  
  // Validate view_type value
  if (!API_VIEW_TYPES.includes(params.view_type)) {
    throw new Error(
      `Invalid view_type: "${params.view_type}". Must be one of: ${API_VIEW_TYPES.join(', ')}`
    );
  }
  
  // Log the API call for debugging
  console.log(`[Analytics API] Fetching with view_type="${params.view_type}"`, {
    classroom_id: params.classroom_id,
    quiz_id: params.quiz_id,
    filters: {
      created_from: params.created_from,
      created_to: params.created_to
    }
  });
  
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  });
  
  const url = `/api/v1/dashboard/quizzes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  try {
    const response = await apiClient.get<QuizListResponse>(url);
    return response.data;
  } catch (error: any) {
    console.error('[Analytics API] Request failed:', {
      view_type: params.view_type,
      error: error.message
    });
    throw error;
  }
};

/**
 * Parse log_data JSON string to structured object
 */
export const parseLogData = (logDataString: string | null): ParsedLogData | null => {
  if (!logDataString) return null;
  
  try {
    return JSON.parse(logDataString) as ParsedLogData;
  } catch (error) {
    console.error('Failed to parse log_data:', error);
    return null;
  }
};

/**
 * Aggregate data into class overview cards
 */
export const aggregateClassOverview = (data: QuizListItem[]): ClassOverview[] => {
  const classMap = new Map<string, ClassOverview>();
  
  data.forEach(quiz => {
    const classId = quiz.classroom_id;
    
    if (!classMap.has(classId)) {
      classMap.set(classId, {
        classroom_id: classId,
        classroom_name: quiz.classroom_name,
        total_quizzes: 0,
        total_students: quiz.total_students || 0,
        missed_count: 0,
        completed_count: 0,
        in_progress_count: 0,
        pending_count: 0,
        expired_count: 0,
        avg_score: 0,
        highest_score: null,
        lowest_score: null,
        completion_rate: 0
      });
    }
    
    const classData = classMap.get(classId)!;
    classData.total_quizzes += 1;
    classData.missed_count += (quiz.total_students || 0) - (quiz.completed_count || 0) - (quiz.in_progress_count || 0) - (quiz.pending_count || 0);
    classData.completed_count += quiz.completed_count || 0;
    classData.in_progress_count += quiz.in_progress_count || 0;
    classData.pending_count += quiz.pending_count || 0;
    
    // Check if quiz is expired
    if (quiz.end_time && new Date(quiz.end_time) < new Date()) {
      classData.expired_count += (quiz.pending_count || 0) + (quiz.in_progress_count || 0);
    }
  });
  
  // Calculate averages and completion rates
  classMap.forEach(classData => {
    const totalAttempts = classData.completed_count + classData.in_progress_count + classData.pending_count + classData.missed_count;
    classData.completion_rate = totalAttempts > 0 ? (classData.completed_count / totalAttempts) * 100 : 0;
    
    // Calculate average score from all completed attempts
    // Note: attempts field is a JSON string that needs to be parsed
    const completedQuizzes = data.filter(q => q.classroom_id === classData.classroom_id);
    let totalScore = 0;
    let scoreCount = 0;
    let highestScore: number | null = null;
    let lowestScore: number | null = null;
    
    completedQuizzes.forEach(quiz => {
      // Parse attempts if it's a string
      let attemptsArray = quiz.attempts;
      if (typeof quiz.attempts === 'string') {
        try {
          attemptsArray = JSON.parse(quiz.attempts);
        } catch (e) {
          console.error('Failed to parse attempts:', e);
          attemptsArray = [];
        }
      }
      
      attemptsArray?.forEach((attempt: any) => {
        if (attempt.status === 'completed' && attempt.score !== null && attempt.score !== undefined) {
          const score = typeof attempt.score === 'number' ? attempt.score : parseFloat(attempt.score);
          if (Number.isNaN(score)) {
            return;
          }
          totalScore += score;
          scoreCount += 1;
          highestScore = highestScore === null ? score : Math.max(highestScore, score);
          lowestScore = lowestScore === null ? score : Math.min(lowestScore, score);
        }
      });
    });
    
    classData.avg_score = scoreCount > 0 ? totalScore / scoreCount : 0;
    classData.highest_score = highestScore;
    classData.lowest_score = lowestScore;
  });
  
  return Array.from(classMap.values());
};

/**
 * Extract status summary for a specific class
 */
export const extractStatusSummary = (data: QuizListItem[], classroomId?: string): StatusSummary => {
  const filtered = classroomId ? data.filter(q => q.classroom_id === classroomId) : data;
  
  const summary: StatusSummary = {
    missed: 0,
    completed: 0,
    pending: 0,
    expired: 0,
    not_started: 0,
    active: 0
  };
  
  filtered.forEach(quiz => {
    const now = new Date();
    const isExpired = quiz.end_time ? new Date(quiz.end_time) < now : false;
    
    summary.completed += quiz.completed_count || 0;
    summary.pending += (quiz.in_progress_count || 0) + (quiz.pending_count || 0);
    
    if (isExpired) {
      summary.expired += (quiz.pending_count || 0) + (quiz.in_progress_count || 0);
    }
    
    // Count availability-based statuses
    if (quiz.availability_status === 'active') {
      summary.active += 1;
    } else if (quiz.availability_status === 'upcoming' || quiz.availability_status === 'not_started') {
      summary.not_started += 1;
    }
    
    // Missed = total students - (completed + in_progress + pending)
    const totalStudents = quiz.total_students || 0;
    const accounted = (quiz.completed_count || 0) + (quiz.in_progress_count || 0) + (quiz.pending_count || 0);
    summary.missed += Math.max(0, totalStudents - accounted);
  });
  
  return summary;
};

/**
 * Transform data into student performance rows (for instructor/admin view)
 */
export const transformToStudentRows = (
  data: QuizListItem[],
  statusFilter?: keyof StatusSummary
): StudentPerformanceRow[] => {
  const rows: StudentPerformanceRow[] = [];
  
  data.forEach(quiz => {
    // Parse attempts if it's a string
    let attemptsArray = quiz.attempts;
    if (typeof quiz.attempts === 'string') {
      try {
        attemptsArray = JSON.parse(quiz.attempts);
      } catch (e) {
        attemptsArray = [];
      }
    }
    
    attemptsArray?.forEach(attempt => {
      // Apply status filter
      if (statusFilter && attempt.status !== statusFilter) {
        return;
      }
      
      // Determine performance level
      let performanceLevel: 'low' | 'medium' | 'high' | null = null;
      if (attempt.score !== null) {
        if (attempt.score < 50) performanceLevel = 'low';
        else if (attempt.score < 75) performanceLevel = 'medium';
        else performanceLevel = 'high';
      }
      
      rows.push({
        student_id: attempt.student_id,
        student_username: attempt.student_username,
        student_fullname: attempt.student_fullname,
        avatar_url: attempt.avatar_url,
        quiz_name: quiz.quiz_name,
        quiz_id: quiz.quiz_id,
        status: attempt.status,
        score: attempt.score,
        time_spent_seconds: attempt.time_spent_seconds,
        submitted_at: attempt.submission?.submitted_at || null,
        attempt_id: attempt.attempt_id,
        performance_level: performanceLevel,
        log_data: attempt.submission?.log_data || null,
        summary: '' // Will be populated later
      });
    });
    
    // Handle pending/missed students
    if (!statusFilter || statusFilter === 'pending' || statusFilter === 'missed') {
      // Parse attempts if it's a string
      let attemptsArray = quiz.attempts;
      if (typeof quiz.attempts === 'string') {
        try {
          attemptsArray = JSON.parse(quiz.attempts);
        } catch (e) {
          attemptsArray = [];
        }
      }
      const attemptedStudentIds = new Set(attemptsArray?.map(a => a.student_id) || []);
      const totalStudents = quiz.total_students || 0;
      const pendingCount = quiz.pending_count || 0;
      
      // If there are pending students but no attempts listed, add placeholder rows
      if (pendingCount > 0 && attemptedStudentIds.size < totalStudents) {
        // Note: We can't show individual pending students without their IDs from API
        // This is a limitation - the API only shows attempted students
      }
    }
  });
  
  return rows;
};

/**
 * Transform data into quiz performance rows (for student view)
 */
export const transformToQuizRows = (
  data: QuizListItem[],
  statusFilter?: keyof StatusSummary
): QuizPerformanceRow[] => {
  return data
    .filter(quiz => {
      if (!statusFilter) return true;
      
      // Determine quiz status from student's perspective
      const hasAttempt = quiz.attempts && quiz.attempts.length > 0;
      const attemptStatus = hasAttempt ? quiz.attempts[0].status : 'pending';
      
      return attemptStatus === statusFilter;
    })
    .map(quiz => {
      const attempt = quiz.attempts?.[0]; // Student view typically shows one attempt
      
      return {
        quiz_id: quiz.quiz_id,
        quiz_name: quiz.quiz_name,
        topic: quiz.topic,
        status: attempt?.status || 'pending',
        score: quiz.best_score || quiz.latest_score || attempt?.score || null,
        time_spent_seconds: quiz.time_spent_seconds || attempt?.time_spent_seconds || null,
        attempts: quiz.student_attempts || (attempt ? 1 : 0),
        submitted_at: quiz.submitted_at || attempt?.submission?.submitted_at || null,
        best_score: quiz.best_score || null,
        log_data: quiz.log_data || attempt?.submission?.log_data || null,
        summary: '' // Will be populated later
      };
    });
};

/**
 * Generate dynamic insights based on data and filters
 */
export const generateInsights = (
  data: QuizListItem[],
  viewType: 'student' | 'instructor' | 'admin',
  classroomId?: string,
  statusFilter?: keyof StatusSummary
): DynamicInsight[] => {
  const insights: DynamicInsight[] = [];
  const filtered = classroomId ? data.filter(q => q.classroom_id === classroomId) : data;
  
  if (viewType === 'student') {
    // Student insights
    const missedCount = filtered.filter(q => {
      let attemptsArray = q.attempts;
      if (typeof q.attempts === 'string') {
        try {
          attemptsArray = JSON.parse(q.attempts);
        } catch (e) {
          attemptsArray = [];
        }
      }
      return !attemptsArray || attemptsArray.length === 0;
    }).length;
    const completedQuizzes = filtered.filter(q => {
      let attemptsArray = q.attempts;
      if (typeof q.attempts === 'string') {
        try {
          attemptsArray = JSON.parse(q.attempts);
        } catch (e) {
          attemptsArray = [];
        }
      }
      return attemptsArray?.some(a => a.status === 'completed');
    });
    const avgScore = completedQuizzes.length > 0
      ? completedQuizzes.reduce((sum, q) => sum + (q.best_score || 0), 0) / completedQuizzes.length
      : 0;
    
    if (missedCount > 0) {
      insights.push({
        text: `You missed ${missedCount} quiz${missedCount > 1 ? 'es' : ''} this week.`,
        type: 'warning'
      });
    }
    
    if (avgScore > 0) {
      insights.push({
        text: `Your average score is ${avgScore.toFixed(1)}%.`,
        type: avgScore >= 75 ? 'success' : 'info'
      });
    }
    
    if (completedQuizzes.length > 3) {
      // Topic performance
      const topicScores = new Map<string, number[]>();
      completedQuizzes.forEach(q => {
        if (q.topic) {
          if (!topicScores.has(q.topic)) topicScores.set(q.topic, []);
          topicScores.get(q.topic)!.push(q.best_score || 0);
        }
      });
      
      if (topicScores.size > 1) {
        const topicAvgs = Array.from(topicScores.entries()).map(([topic, scores]) => ({
          topic,
          avg: scores.reduce((a, b) => a + b, 0) / scores.length
        }));
        topicAvgs.sort((a, b) => b.avg - a.avg);
        
        if (topicAvgs.length >= 2) {
          insights.push({
            text: `You perform better in ${topicAvgs[0].topic} than ${topicAvgs[topicAvgs.length - 1].topic}.`,
            type: 'info'
          });
        }
      }
    }
  } else {
    // Instructor/Admin insights
    const statusSummary = extractStatusSummary(filtered);
    
    if (statusFilter === 'missed' && statusSummary.missed > 0) {
      insights.push({
        text: `${statusSummary.missed} student${statusSummary.missed > 1 ? 's' : ''} missed this quiz.`,
        type: 'warning'
      });
    }
    
    if (statusFilter === 'completed' || !statusFilter) {
      // Calculate average scores by topic
      const topicScores = new Map<string, number[]>();
      filtered.forEach(quiz => {
        if (quiz.topic) {
          // Parse attempts if it's a string
          let attemptsArray = quiz.attempts;
          if (typeof quiz.attempts === 'string') {
            try {
              attemptsArray = JSON.parse(quiz.attempts);
            } catch (e) {
              attemptsArray = [];
            }
          }
          
          attemptsArray?.forEach(attempt => {
            if (attempt.status === 'completed' && attempt.score !== null) {
              if (!topicScores.has(quiz.topic!)) topicScores.set(quiz.topic!, []);
              topicScores.get(quiz.topic!)!.push(attempt.score);
            }
          });
        }
      });
      
      if (topicScores.size > 0) {
        const lowPerformingTopics = Array.from(topicScores.entries())
          .map(([topic, scores]) => ({
            topic,
            avg: scores.reduce((a, b) => a + b, 0) / scores.length
          }))
          .filter(t => t.avg < 60)
          .sort((a, b) => a.avg - b.avg);
        
        if (lowPerformingTopics.length > 0) {
          insights.push({
            text: `${lowPerformingTopics[0].topic} topic needs reinforcement.`,
            type: 'warning'
          });
        }
        
        // High performing topics
        const highPerformingTopics = Array.from(topicScores.entries())
          .map(([topic, scores]) => ({
            topic,
            avg: scores.reduce((a, b) => a + b, 0) / scores.length
          }))
          .filter(t => t.avg >= 80);
        
        if (highPerformingTopics.length > 0) {
          insights.push({
            text: `${highPerformingTopics[0].topic} shows strong understanding.`,
            type: 'success'
          });
        }
      }
      
      // Time analysis
      const completedAttempts = filtered.flatMap(q => {
        let attemptsArray = q.attempts;
        if (typeof q.attempts === 'string') {
          try {
            attemptsArray = JSON.parse(q.attempts);
          } catch (e) {
            attemptsArray = [];
          }
        }
        return attemptsArray?.filter(a => a.status === 'completed') || [];
      });
      if (completedAttempts.length > 0) {
        const avgTime = completedAttempts.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0) / completedAttempts.length;
        if (avgTime > 0) {
          insights.push({
            text: `Most students completed within ${Math.round(avgTime)} seconds.`,
            type: 'info'
          });
        }
      }
    }
  }
  
  return insights.slice(0, 3); // Return max 3 insights
};

/**
 * Calculate Academic KPIs
 */
export const calculateAcademicKPIs = (data: QuizListItem[]): AcademicKPIs => {
  const completedAttempts = data.flatMap(q => {
    let attemptsArray = q.attempts;
    if (typeof q.attempts === 'string') {
      try {
        attemptsArray = JSON.parse(q.attempts);
      } catch (e) {
        attemptsArray = [];
      }
    }
    return attemptsArray?.filter(a => a.status === 'completed' && a.score !== null) || [];
  });
  
  const avgScoreOverall = completedAttempts.length > 0
    ? completedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / completedAttempts.length
    : 0;
  
  // By class
  const classScores = new Map<string, number[]>();
  data.forEach(quiz => {
    let attemptsArray = quiz.attempts;
    if (typeof quiz.attempts === 'string') {
      try {
        attemptsArray = JSON.parse(quiz.attempts);
      } catch (e) {
        attemptsArray = [];
      }
    }
    attemptsArray?.filter(a => a.status === 'completed' && a.score !== null).forEach(attempt => {
      if (!classScores.has(quiz.classroom_name)) classScores.set(quiz.classroom_name, []);
      classScores.get(quiz.classroom_name)!.push(attempt.score!);
    });
  });
  
  const avgScoreByClass = Array.from(classScores.entries()).map(([className, scores]) => ({
    className,
    avgScore: scores.reduce((a, b) => a + b, 0) / scores.length
  }));
  
  // By subject
  const subjectScores = new Map<string, number[]>();
  data.forEach(quiz => {
    if (quiz.subject) {
      let attemptsArray = quiz.attempts;
      if (typeof quiz.attempts === 'string') {
        try {
          attemptsArray = JSON.parse(quiz.attempts);
        } catch (e) {
          attemptsArray = [];
        }
      }
      attemptsArray?.filter(a => a.status === 'completed' && a.score !== null).forEach(attempt => {
        if (!subjectScores.has(quiz.subject!)) subjectScores.set(quiz.subject!, []);
        subjectScores.get(quiz.subject!)!.push(attempt.score!);
      });
    }
  });
  
  const avgScoreBySubject = Array.from(subjectScores.entries()).map(([subject, scores]) => ({
    subject,
    avgScore: scores.reduce((a, b) => a + b, 0) / scores.length
  }));
  
  // Rates
  const totalAttempts = data.reduce((sum, q) => sum + ((q.total_students || 0) * 1), 0);
  const completedCount = data.reduce((sum, q) => sum + (q.completed_count || 0), 0);
  const missedCount = data.reduce((sum, q) => {
    const total = q.total_students || 0;
    const accounted = (q.completed_count || 0) + (q.in_progress_count || 0) + (q.pending_count || 0);
    return sum + Math.max(0, total - accounted);
  }, 0);
  
  const completionRate = totalAttempts > 0 ? (completedCount / totalAttempts) * 100 : 0;
  const missedRate = totalAttempts > 0 ? (missedCount / totalAttempts) * 100 : 0;
  const lowScoreCount = completedAttempts.filter(a => (a.score || 0) < 50).length;
  const lowScoreRate = completedAttempts.length > 0 ? (lowScoreCount / completedAttempts.length) * 100 : 0;
  
  return {
    avg_score_overall: avgScoreOverall,
    avg_score_by_class: avgScoreByClass,
    avg_score_by_subject: avgScoreBySubject,
    completion_rate: completionRate,
    missed_rate: missedRate,
    low_score_rate: lowScoreRate
  };
};

/**
 * Calculate Engagement KPIs
 */
export const calculateEngagementKPIs = (data: QuizListItem[]): EngagementKPIs => {
  const completedAttempts = data.flatMap(q => {
    let attemptsArray = q.attempts;
    if (typeof q.attempts === 'string') {
      try {
        attemptsArray = JSON.parse(q.attempts);
      } catch (e) {
        attemptsArray = [];
      }
    }
    return attemptsArray?.filter(a => a.status === 'completed') || [];
  });
  const inProgressAttempts = data.flatMap(q => {
    let attemptsArray = q.attempts;
    if (typeof q.attempts === 'string') {
      try {
        attemptsArray = JSON.parse(q.attempts);
      } catch (e) {
        attemptsArray = [];
      }
    }
    return attemptsArray?.filter(a => a.status === 'in_progress') || [];
  });
  
  const avgTimeSpent = completedAttempts.length > 0
    ? completedAttempts.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0) / completedAttempts.length
    : 0;
  
  const dropOffRate = (completedAttempts.length + inProgressAttempts.length) > 0
    ? (inProgressAttempts.length / (completedAttempts.length + inProgressAttempts.length)) * 100
    : 0;
  
  // Late submissions (submitted after due date)
  const lateSubmissions = completedAttempts.filter(a => {
    const quiz = data.find(q => {
      let attemptsArray = q.attempts;
      if (typeof q.attempts === 'string') {
        try {
          attemptsArray = JSON.parse(q.attempts);
        } catch (e) {
          attemptsArray = [];
        }
      }
      return attemptsArray?.some(att => att.attempt_id === a.attempt_id);
    });
    if (!quiz?.due_date || !a.submission?.submitted_at) return false;
    return new Date(a.submission.submitted_at) > new Date(quiz.due_date);
  });
  const lateSubmissionRate = completedAttempts.length > 0 ? (lateSubmissions.length / completedAttempts.length) * 100 : 0;
  
  // Retry frequency
  const studentAttemptCounts = new Map<string, number>();
  data.forEach(quiz => {
    // Parse attempts if it's a string
    let attemptsArray = quiz.attempts;
    if (typeof quiz.attempts === 'string') {
      try {
        attemptsArray = JSON.parse(quiz.attempts);
      } catch (e) {
        attemptsArray = [];
      }
    }
    
    attemptsArray?.forEach(attempt => {
      studentAttemptCounts.set(
        `${attempt.student_id}-${quiz.quiz_id}`,
        (studentAttemptCounts.get(`${attempt.student_id}-${quiz.quiz_id}`) || 0) + 1
      );
    });
  });
  const retryFrequency = studentAttemptCounts.size > 0
    ? Array.from(studentAttemptCounts.values()).reduce((a, b) => a + b, 0) / studentAttemptCounts.size
    : 0;
  
  return {
    avg_time_spent: avgTimeSpent,
    drop_off_rate: dropOffRate,
    late_submission_rate: lateSubmissionRate,
    retry_frequency: retryFrequency
  };
};

/**
 * Calculate Teaching Effectiveness KPIs
 */
export const calculateTeachingEffectivenessKPIs = (data: QuizListItem[]): TeachingEffectivenessKPIs => {
  const completedAttempts = data.flatMap(q => {
    let attemptsArray = q.attempts;
    if (typeof q.attempts === 'string') {
      try {
        attemptsArray = JSON.parse(q.attempts);
      } catch (e) {
        attemptsArray = [];
      }
    }
    return attemptsArray?.filter(a => a.status === 'completed' && a.score !== null) || [];
  });
  
  // Difficulty index: high time + low score = difficult
  const difficultyScores = completedAttempts
    .filter(a => a.time_spent_seconds && a.score !== null)
    .map(a => {
      const normalizedTime = Math.min((a.time_spent_seconds! / 60), 1); // Cap at 60 seconds = 1
      const normalizedScore = (100 - (a.score || 0)) / 100; // Higher score = lower difficulty
      return (normalizedTime + normalizedScore) / 2;
    });
  
  const difficultyIndex = difficultyScores.length > 0
    ? (difficultyScores.reduce((a, b) => a + b, 0) / difficultyScores.length) * 100
    : 50;
  
  // Risk topics
  const topicStats = new Map<string, { scores: number[], attempts: number }>();
  data.forEach(quiz => {
    if (quiz.topic) {
      if (!topicStats.has(quiz.topic)) {
        topicStats.set(quiz.topic, { scores: [], attempts: 0 });
      }
      const stats = topicStats.get(quiz.topic)!;
      let attemptsArray = quiz.attempts;
      if (typeof quiz.attempts === 'string') {
        try {
          attemptsArray = JSON.parse(quiz.attempts);
        } catch (e) {
          attemptsArray = [];
        }
      }
      attemptsArray?.filter(a => a.status === 'completed' && a.score !== null).forEach(attempt => {
        stats.scores.push(attempt.score!);
        stats.attempts += 1;
      });
    }
  });
  
  const riskTopics = Array.from(topicStats.entries())
    .map(([topic, stats]) => ({
      topic,
      avgScore: stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length,
      attempts: stats.attempts
    }))
    .filter(t => t.avgScore < 60)
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 5);
  
  // Participation index
  const totalPossibleAttempts = data.reduce((sum, q) => sum + (q.total_students || 0), 0);
  const actualAttempts = data.reduce((sum, q) => {
    let attemptsArray = q.attempts;
    if (typeof q.attempts === 'string') {
      try {
        attemptsArray = JSON.parse(q.attempts);
      } catch (e) {
        attemptsArray = [];
      }
    }
    return sum + (Array.isArray(attemptsArray) ? attemptsArray.length : 0);
  }, 0);
  const participationIndex = totalPossibleAttempts > 0 ? (actualAttempts / totalPossibleAttempts) * 100 : 0;
  
  return {
    difficulty_index: difficultyIndex,
    risk_topics: riskTopics,
    participation_index: participationIndex
  };
};

/**
 * Calculate Student Health KPIs
 */
export const calculateStudentHealthKPIs = (data: QuizListItem[]): StudentHealthKPIs => {
  const studentStats = new Map<string, {
    name: string;
    missedCount: number;
    scores: number[];
    recentScores: number[];
  }>();
  
  data.forEach(quiz => {
    // Parse attempts if it's a string
    let attemptsArray = quiz.attempts;
    if (typeof quiz.attempts === 'string') {
      try {
        attemptsArray = JSON.parse(quiz.attempts);
      } catch (e) {
        attemptsArray = [];
      }
    }
    
    attemptsArray?.forEach(attempt => {
      if (!studentStats.has(attempt.student_id)) {
        studentStats.set(attempt.student_id, {
          name: attempt.student_fullname,
          missedCount: 0,
          scores: [],
          recentScores: []
        });
      }
      const stats = studentStats.get(attempt.student_id)!;
      if (attempt.status === 'completed' && attempt.score !== null) {
        stats.scores.push(attempt.score);
        // Consider last 5 attempts as recent
        if (stats.recentScores.length < 5) {
          stats.recentScores.push(attempt.score);
        }
      }
    });
  });
  
  // Calculate missed counts
  // Note: We can't accurately calculate missed students without full student list from API
  
  let atRiskCount = 0;
  let improvingCount = 0;
  let consistentCount = 0;
  const atRiskStudents: StudentHealthKPIs['at_risk_students'] = [];
  
  studentStats.forEach((stats, studentId) => {
    const avgScore = stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length;
    
    // At-risk: high missed or low avg score
    if (stats.missedCount > 2 || avgScore < 50) {
      atRiskCount += 1;
      atRiskStudents.push({
        student_id: studentId,
        student_name: stats.name,
        missed_count: stats.missedCount,
        avg_score: avgScore
      });
    }
    
    // Improving: recent scores better than overall average
    if (stats.recentScores.length >= 3) {
      const recentAvg = stats.recentScores.reduce((a, b) => a + b, 0) / stats.recentScores.length;
      if (recentAvg > avgScore + 5) {
        improvingCount += 1;
      }
    }
    
    // Consistent: low variance in scores
    if (stats.scores.length >= 3) {
      const variance = stats.scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / stats.scores.length;
      if (variance < 100) {
        consistentCount += 1;
      }
    }
  });
  
  return {
    at_risk_count: atRiskCount,
    improving_count: improvingCount,
    consistent_count: consistentCount,
    at_risk_students: atRiskStudents.sort((a, b) => a.avg_score - b.avg_score).slice(0, 10)
  };
};

/**
 * Calculate School Overview KPIs
 */
export const calculateSchoolOverviewKPIs = (data: QuizListItem[]): SchoolOverviewKPIs => {
  const classStats = new Map<string, {
    avgScore: number;
    completionRate: number;
    missedRate: number;
    totalQuizzes: number;
  }>();
  
  data.forEach(quiz => {
    if (!classStats.has(quiz.classroom_name)) {
      classStats.set(quiz.classroom_name, {
        avgScore: 0,
        completionRate: 0,
        missedRate: 0,
        totalQuizzes: 0
      });
    }
    
    const stats = classStats.get(quiz.classroom_name)!;
    stats.totalQuizzes += 1;
    
    let attemptsArray = quiz.attempts;
    if (typeof quiz.attempts === 'string') {
      try {
        attemptsArray = JSON.parse(quiz.attempts);
      } catch (e) {
        attemptsArray = [];
      }
    }
    const completedAttempts = attemptsArray?.filter(a => a.status === 'completed' && a.score !== null) || [];
    if (completedAttempts.length > 0) {
      const quizAvgScore = completedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / completedAttempts.length;
      stats.avgScore = (stats.avgScore * (stats.totalQuizzes - 1) + quizAvgScore) / stats.totalQuizzes;
    }
    
    const totalStudents = quiz.total_students || 0;
    const completedCount = quiz.completed_count || 0;
    const missedCount = Math.max(0, totalStudents - completedCount - (quiz.in_progress_count || 0) - (quiz.pending_count || 0));
    
    stats.completionRate = totalStudents > 0 ? (completedCount / totalStudents) * 100 : 0;
    stats.missedRate = totalStudents > 0 ? (missedCount / totalStudents) * 100 : 0;
  });
  
  const classArray = Array.from(classStats.entries()).map(([className, stats]) => ({
    className,
    ...stats
  }));
  
  const topClasses = classArray
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 5)
    .map(c => ({
      className: c.className,
      avgScore: c.avgScore,
      completionRate: c.completionRate
    }));
  
  const interventionNeeded = classArray
    .filter(c => c.missedRate > 20 || c.avgScore < 60)
    .sort((a, b) => b.missedRate - a.missedRate)
    .slice(0, 5)
    .map(c => ({
      className: c.className,
      missedRate: c.missedRate,
      avgScore: c.avgScore
    }));
  
  // Health status based on overall metrics
  const overallAvgScore = classArray.reduce((sum, c) => sum + c.avgScore, 0) / (classArray.length || 1);
  const overallCompletionRate = classArray.reduce((sum, c) => sum + c.completionRate, 0) / (classArray.length || 1);
  
  let healthStatus: 'green' | 'amber' | 'red' = 'green';
  if (overallAvgScore < 60 || overallCompletionRate < 70) {
    healthStatus = 'red';
  } else if (overallAvgScore < 75 || overallCompletionRate < 85) {
    healthStatus = 'amber';
  }
  
  return {
    top_classes: topClasses,
    intervention_needed: interventionNeeded,
    instructor_load: [], // Would require instructor data
    health_status: healthStatus
  };
};

/**
 * Aggregate data into quiz tiles (for instructor/admin quiz grid layer)
 */
export const aggregateQuizTiles = (data: QuizListItem[], classroomId: string): QuizTile[] => {
  const filtered = data.filter(q => q.classroom_id === classroomId);
  
  return filtered.map(quiz => {
    const totalStudents = quiz.total_students || 0;
    const completedCount = quiz.completed_count || 0;
    const pendingCount = quiz.pending_count || 0;
    const inProgressCount = quiz.in_progress_count || 0;
    
    // Calculate missed count
    const accountedStudents = completedCount + pendingCount + inProgressCount;
    const missedCount = Math.max(0, totalStudents - accountedStudents);
    
    // Calculate expired count
    const now = new Date();
    const isExpired = quiz.end_time ? new Date(quiz.end_time) < now : false;
    const expiredCount = isExpired ? (pendingCount + inProgressCount) : 0;
    
    // Calculate score metrics from completed attempts
    let totalScore = 0;
    let scoreCount = 0;
    let highestScore: number | null = null;
    let lowestScore: number | null = null;
    
    // Parse attempts if it's a string
    let attemptsArray = quiz.attempts;
    if (typeof quiz.attempts === 'string') {
      try {
        attemptsArray = JSON.parse(quiz.attempts);
      } catch (e) {
        attemptsArray = [];
      }
    }
    
    const studentScores = new Map<string, number[]>();

    attemptsArray?.forEach(attempt => {
      if (attempt.status === 'completed' && attempt.score !== null && attempt.score !== undefined) {
        const score = typeof attempt.score === 'number' ? attempt.score : parseFloat(attempt.score);
        if (Number.isNaN(score)) {
          return;
        }
        totalScore += score;
        scoreCount += 1;
        highestScore = highestScore === null ? score : Math.max(highestScore, score);
        lowestScore = lowestScore === null ? score : Math.min(lowestScore, score);

        const scores = studentScores.get(attempt.student_id) || [];
        scores.push(score);
        studentScores.set(attempt.student_id, scores);
      }
    });
    const avgScore = scoreCount > 0 ? totalScore / scoreCount : 0;

    let atRiskCount = 0;
    studentScores.forEach(scores => {
      const avgStudentScore = scores.reduce((sum, value) => sum + value, 0) / scores.length;
      if (avgStudentScore < 40) {
        atRiskCount += 1;
      }
    });
    
    // Calculate completion rate
    const completionRate = totalStudents > 0 ? (completedCount / totalStudents) * 100 : 0;
    
    return {
      quiz_id: quiz.quiz_id,
      session_id: quiz.session_id,
      classroom_id: quiz.classroom_id,
      quiz_name: quiz.quiz_name,
      topic: quiz.topic,
      subject: quiz.subject,
      total_students: totalStudents,
      completed_count: completedCount,
      pending_count: pendingCount,
      in_progress_count: inProgressCount,
      missed_count: missedCount,
      expired_count: expiredCount,
      avg_score: avgScore,
      highest_score: highestScore,
      lowest_score: lowestScore,
      at_risk_count: atRiskCount,
      completion_rate: completionRate,
      created_at: quiz.created_at,
      due_date: quiz.due_date
    };
  });
};

/**
 * Generate summary text for student performance row
 */
export const generateStudentSummary = (row: StudentPerformanceRow): string => {
  if (row.status === 'completed') {
    if (row.score === null) return 'Completed';
    if (row.performance_level === 'high') return `Excellent: ${row.score}%`;
    if (row.performance_level === 'medium') return `Good: ${row.score}%`;
    return `Needs improvement: ${row.score}%`;
  }
  if (row.status === 'in_progress') return 'In progress';
  if (row.status === 'pending') return 'Not started';
  if (row.status === 'expired') return 'Expired';
  if (row.status === 'missed') return 'Missed';
  return row.status;
};

/**
 * Generate summary text for quiz performance row
 */
export const generateQuizSummary = (row: QuizPerformanceRow): string => {
  if (row.status === 'completed') {
    if (row.best_score === null) return 'Completed';
    const attempts = row.attempts > 1 ? ` (${row.attempts} attempts)` : '';
    if (row.best_score >= 90) return `Excellent: ${row.best_score}%${attempts}`;
    if (row.best_score >= 75) return `Good: ${row.best_score}%${attempts}`;
    if (row.best_score >= 50) return `Fair: ${row.best_score}%${attempts}`;
    return `Poor: ${row.best_score}%${attempts}`;
  }
  if (row.status === 'in_progress') return 'In progress';
  if (row.status === 'pending') return 'Not started';
  if (row.status === 'expired') return 'Expired';
  if (row.status === 'missed') return 'Missed';
  return row.status;
};
