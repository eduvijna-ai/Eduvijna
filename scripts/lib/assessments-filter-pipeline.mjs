/**
 * Mirrors Assessments.tsx teacher filter pipeline for fixture tracing (no React).
 */

export function applyTeacherAssessmentFilters(allQuizzes, options = {}) {
  const {
    selectedTab = 'all',
    selectedClassroom = 'all',
    selectedDateFilter = 'all',
    dateRangeStart = new Date(),
    dateRangeEnd = new Date(),
    searchQuery = '',
  } = options;

  const baseFiltered = allQuizzes.filter((quiz) => {
    if (selectedClassroom && selectedClassroom !== 'all') {
      const quizClassroomId = String(quiz.classroom_id || quiz.class_id || '');
      if (quizClassroomId !== String(selectedClassroom)) return false;
    }

    if (selectedDateFilter !== 'all') {
      const quizDateString = quiz.created_at || quiz.start_time || quiz.assigned_at;
      if (quizDateString) {
        const quizDate = new Date(quizDateString);
        const start = new Date(dateRangeStart.getTime());
        const end = new Date(dateRangeEnd.getTime());
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        if (quizDate < start || quizDate > end) return false;
      }
    }

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const quizName = quiz.quiz_name || '';
      const topic = quiz.topic || '';
      if (!quizName.toLowerCase().includes(searchLower) && !topic.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    return true;
  });

  const filtered = baseFiltered.filter((quiz) => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'active') return quiz.availability_status === 'active';
    if (selectedTab === 'available_soon') return quiz.availability_status === 'coming soon';
    if (selectedTab === 'expired') return quiz.availability_status === 'expired';
    return true;
  });

  return { baseFiltered, filtered };
}

export function traceFixtureAssignment(allQuizzes, fixture, labels = {}) {
  const quizId = Number(fixture.quizId);
  const sessionId = String(fixture.sessionId ?? '');
  const inResponse = allQuizzes.find(
    (q) => Number(q.quiz_id) === quizId && String(q.session_id ?? '') === sessionId,
  );

  if (!inResponse) {
    const sameQuiz = allQuizzes.filter((q) => Number(q.quiz_id) === quizId);
    return {
      boundary: 'missing_from_api_response',
      inResponse: false,
      sameQuizIdCount: sameQuiz.length,
      sessionIdsRedacted: sameQuiz.map((q) => String(q.session_id ?? '').slice(0, 8)),
    };
  }

  const tab =
    inResponse.availability_status === 'expired'
      ? 'expired'
      : inResponse.availability_status === 'active'
        ? 'active'
        : inResponse.availability_status === 'coming soon'
          ? 'available_soon'
          : 'all';

  const searchToken = labels.searchToken || String(inResponse.quiz_name || '').slice(0, 14);
  const strategies = [
    { selectedTab: tab, searchQuery: searchToken },
    { selectedTab: 'all', searchQuery: searchToken },
    { selectedTab: tab, searchQuery: '' },
    { selectedTab: 'all', searchQuery: '' },
  ];

  for (const opts of strategies) {
    const { filtered } = applyTeacherAssessmentFilters(allQuizzes, opts);
    const index = filtered.findIndex(
      (q) => Number(q.quiz_id) === quizId && String(q.session_id ?? '') === sessionId,
    );
    if (index >= 0) {
      const displayCountInitial = 10;
      return {
        boundary: 'ok',
        inResponse: true,
        availability: inResponse.availability_status,
        filterStrategy: opts,
        indexInFilteredList: index,
        renderedInitially: index < displayCountInitial,
        loadMoreTapsNeeded: Math.max(0, Math.ceil((index + 1 - displayCountInitial) / 10)),
        openStudentsTestId: `assessment-open-students-${quizId}-${sessionId}`,
        classroomName: inResponse.classroom_name || inResponse.class_name || labels.classLabel,
      };
    }
  }

  return {
    boundary: 'dropped_by_normalization_or_filter',
    inResponse: true,
    availability: inResponse.availability_status,
    normalized: {
      quiz_id: inResponse.quiz_id,
      session_id: String(inResponse.session_id ?? '').slice(0, 8),
      classroom_id: inResponse.classroom_id || inResponse.class_id,
      availability_status: inResponse.availability_status,
    },
  };
}
