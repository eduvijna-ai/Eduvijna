import {
  getStudentDashboardListEpoch,
  markStudentDashboardListStale,
} from '../core/services/studentDashboardRefresh.service';

describe('studentDashboardRefresh list epoch', () => {
  it('bumps epoch so focus debounce cannot treat post-submit lists as fresh', () => {
    const before = getStudentDashboardListEpoch();
    markStudentDashboardListStale();
    expect(getStudentDashboardListEpoch()).toBe(before + 1);
    markStudentDashboardListStale();
    expect(getStudentDashboardListEpoch()).toBe(before + 2);
  });
});
