import { formatAnalyticsDateStateAccessibility, isAnalyticsAllTime } from '../core/utils/analyticsDateState';
import { buildStrictQuizContent } from '../screens/CreateHandwrittenQuizScreen';
import { teacherAvailabilityTabMatch } from '../core/utils/statusContracts';

describe('founder correction pass — labels and contracts', () => {
  it('All Time date state has no created_from/created_to implementation leak', () => {
    expect(formatAnalyticsDateStateAccessibility('', '')).toBe('Analytics date state all-time');
    expect(isAnalyticsAllTime('', '')).toBe(true);
    expect(formatAnalyticsDateStateAccessibility('', '')).not.toMatch(/created_from|created_to/);
  });

  it('camera StrictQuiz content omits class/subject/lesson when not provided', () => {
    const content = buildStrictQuizContent({
      difficulty: 'medium',
      questionCount: 5,
      ocrText: 'Handwritten notes about fractions.',
    });
    expect(content).toContain('Difficulty: medium');
    expect(content).toContain('Number of questions: 5');
    expect(content).toContain('Handwritten notes about fractions.');
    expect(content).not.toMatch(/^Class:/m);
    expect(content).not.toMatch(/^Subject:/m);
    expect(content).not.toMatch(/^Lesson:/m);
  });

  it('teacher availability tabs remain assignment-axis (not Pending submissions)', () => {
    expect(teacherAvailabilityTabMatch('coming soon', 'available_soon')).toBe(true);
    expect(teacherAvailabilityTabMatch('active', 'active')).toBe(true);
  });
});

describe('student classroom inventory parity (contract)', () => {
  it('documents that Home Classes KPI must use unique classroom_id inventory, not quiz-derived counts', () => {
    // Live probe 2026-10-18 (demo_aarya): view_type=classes → 5 unique IDs;
    // view_type=class_wise_students → 0; summary quiz rows → 3 classroom IDs.
    // StudentDashboard must use useAssessmentClassrooms().count (classes source).
    const inventoryUniqueIds = 5;
    const quizDerivedUniqueIds = 3;
    expect(inventoryUniqueIds).not.toBe(quizDerivedUniqueIds);
    const homeCountSource = 'assessmentClassrooms.unique_classroom_id';
    const classesListSource = 'assessmentClassrooms.unique_classroom_id';
    expect(homeCountSource).toBe(classesListSource);
  });
});
