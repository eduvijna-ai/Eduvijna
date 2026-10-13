export type AssessmentsDataStateInput = {
  teacherSourceCount: number;
  baseFilteredCount: number;
  filteredCount: number;
  selectedTab: string;
  selectedClassroom: string;
  selectedDateFilter: string;
  loading: boolean;
};

export function formatAssessmentsDataStateAccessibility(
  input: AssessmentsDataStateInput,
): string {
  const classroom =
    input.selectedClassroom === 'all' ? 'all' : `id-${input.selectedClassroom}`;
  return [
    'assessments-data-state',
    `source-${input.teacherSourceCount}`,
    `base-${input.baseFilteredCount}`,
    `filtered-${input.filteredCount}`,
    `tab-${input.selectedTab}`,
    `classroom-${classroom}`,
    `date-${input.selectedDateFilter}`,
    `loading-${input.loading}`,
  ].join(' ');
}
