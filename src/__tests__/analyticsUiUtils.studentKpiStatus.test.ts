import { generateStudentKPITiles } from '../core/utils/analyticsUiUtils';
import type { QuizListItem } from '../core/types/quizAnalytics.types';

describe('generateStudentKPITiles student_status', () => {
  it('counts completed from student_status when scores are null', () => {
    const rows = [
      { student_status: 'completed', best_score: null, availability_status: 'expired' },
      { student_status: 'completed', latest_score: null, availability_status: 'active' },
      { student_status: 'pending', availability_status: 'active' },
      { student_status: 'missed', availability_status: 'expired' },
    ] as QuizListItem[];

    const tiles = generateStudentKPITiles(rows);
    expect(tiles.find((t) => t.title === 'Completed')?.value).toBe(2);
    expect(tiles.find((t) => t.title === 'Pending')?.value).toBe(1);
    expect(tiles.find((t) => t.title === 'Missed')?.value).toBe(1);
  });
});
