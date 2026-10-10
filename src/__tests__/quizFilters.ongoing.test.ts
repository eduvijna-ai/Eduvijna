import { isStudentQuizOngoing } from '../utils/quizFilters';

describe('isStudentQuizOngoing', () => {
  const activeWindow = {
    availability_status: 'active',
    start_time: '2020-01-01T00:00:00.000Z',
    end_time: '2099-01-01T00:00:00.000Z',
  };

  it('includes in_progress assignments', () => {
    expect(
      isStudentQuizOngoing({
        status: 'in_progress',
        ...activeWindow,
      }),
    ).toBe(true);
  });

  it('includes started assignments', () => {
    expect(
      isStudentQuizOngoing({
        status: 'started',
        ...activeWindow,
      }),
    ).toBe(true);
  });

  it('excludes completed assignments', () => {
    expect(
      isStudentQuizOngoing({
        status: 'completed',
        ...activeWindow,
      }),
    ).toBe(false);
  });
});
