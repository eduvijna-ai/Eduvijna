import { mergeAssessmentClassroomInventoryWithMetrics } from '../core/services/assessmentClassroomAnalytics';
import type { ClassOverview } from '../core/types/quizAnalytics.types';

describe('student analytics classroom inventory merge', () => {
  it('keeps authorized classes with zero assessment metrics visible', () => {
    const inventory = [
      {
        classroom_id: 'class_a',
        classroom_name: '4A-Telugu',
        instructor: {
          instructor_id: '0',
          instructor_username: 'x',
          instructor_fullname: 'x',
          instructor_avatar_url: null,
        },
        total_students: 0,
      },
      {
        classroom_id: 'class_b',
        classroom_name: '4A-Mathematics',
        instructor: {
          instructor_id: '0',
          instructor_username: 'x',
          instructor_fullname: 'x',
          instructor_avatar_url: null,
        },
        total_students: 0,
      },
    ];
    const metrics: ClassOverview[] = [
      {
        classroom_id: 'class_b',
        classroom_name: '4A-Mathematics',
        total_quizzes: 32,
        total_students: 0,
        missed_count: 0,
        completed_count: 21,
        in_progress_count: 0,
        pending_count: 0,
        expired_count: 0,
        avg_score: null,
        highest_score: null,
        lowest_score: null,
        completion_rate: 0,
      },
    ];

    const merged = mergeAssessmentClassroomInventoryWithMetrics(inventory, metrics);
    expect(merged).toHaveLength(2);
    expect(merged.map((c) => c.classroom_id)).toEqual(['class_a', 'class_b']);
    expect(merged[0].total_quizzes).toBe(0);
    expect(merged[0].avg_score).toBeNull();
    expect(merged[1].completed_count).toBe(21);
    expect(merged[1].avg_score).toBeNull();
  });
});
