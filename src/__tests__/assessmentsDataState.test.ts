import { formatAssessmentsDataStateAccessibility } from '../core/utils/assessmentsDataState';

describe('formatAssessmentsDataStateAccessibility', () => {
  it('formats stable E2E marker text without PII', () => {
    expect(
      formatAssessmentsDataStateAccessibility({
        teacherSourceCount: 42,
        baseFilteredCount: 42,
        filteredCount: 8,
        selectedTab: 'expired',
        selectedClassroom: 'all',
        selectedDateFilter: 'all',
        loading: false,
      }),
    ).toBe(
      'assessments-data-state source-42 base-42 filtered-8 tab-expired classroom-all date-all loading-false',
    );
  });

  it('scopes classroom id when not all', () => {
    expect(
      formatAssessmentsDataStateAccessibility({
        teacherSourceCount: 1,
        baseFilteredCount: 1,
        filteredCount: 1,
        selectedTab: 'all',
        selectedClassroom: 'class_4d82c60e',
        selectedDateFilter: 'week',
        loading: true,
      }),
    ).toContain('classroom-id-class_4d82c60e');
    expect(
      formatAssessmentsDataStateAccessibility({
        teacherSourceCount: 1,
        baseFilteredCount: 1,
        filteredCount: 1,
        selectedTab: 'all',
        selectedClassroom: 'class_4d82c60e',
        selectedDateFilter: 'week',
        loading: true,
      }),
    ).toContain('loading-true');
  });
});
