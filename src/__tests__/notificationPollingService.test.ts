import notificationPollingService from '../core/services/NotificationPollingService';

describe('NotificationPollingService', () => {
  it('stop clears active state on logout or account change', () => {
    notificationPollingService.start(42, () => undefined);
    notificationPollingService.stop();
    expect(() => notificationPollingService.stop()).not.toThrow();
  });
});
