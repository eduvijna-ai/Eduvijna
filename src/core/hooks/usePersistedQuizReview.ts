import { useEffect, useState } from 'react';
import { fetchPersistedQuizResult } from '../services/quizResultRetrieval.service';
import type { PlayableQuizQuestion } from '../utils/answerMappingUtils';

export interface PersistedQuizReviewParams {
  enabled: boolean;
  quizId?: number | string;
  studentId?: string;
  sessionId?: string | null;
  classroomId?: string | null;
  attemptId?: number;
  isTeacherView?: boolean;
}

export function usePersistedQuizReview(params: PersistedQuizReviewParams) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<PlayableQuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    if (!params.enabled || !params.quizId || !params.studentId) {
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchPersistedQuizResult({
          quizId: params.quizId!,
          studentId: params.studentId!,
          sessionId: params.sessionId,
          classroomId: params.classroomId,
          attemptId: params.attemptId,
          isTeacherView: params.isTeacherView,
        });
        if (cancelled) return;
        if (result.status === 'ready') {
          setQuestions(result.quizData.questions);
          setUserAnswers(result.userAnswers);
          setScore(result.score);
          setError(null);
        } else if (result.status === 'error') {
          setQuestions([]);
          setUserAnswers([]);
          setError(result.message);
        } else {
          setQuestions([]);
          setUserAnswers([]);
          setError('No saved results were found for this assignment.');
        }
      } catch {
        if (!cancelled) {
          setError('Could not load quiz results. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [
    params.attemptId,
    params.classroomId,
    params.enabled,
    params.isTeacherView,
    params.quizId,
    params.sessionId,
    params.studentId,
  ]);

  return { loading, error, questions, userAnswers, score };
}
