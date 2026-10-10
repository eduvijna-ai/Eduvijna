import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadReadNotificationIds,
  persistReadNotificationId,
  clearReadNotificationIds,
} from '../core/api/notificationReadState';

describe('notificationReadState', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('persists read ids per account', async () => {
    await persistReadNotificationId('teacher-1', 100);
    const ids = await loadReadNotificationIds('teacher-1');
    expect(ids.has(100)).toBe(true);
    const other = await loadReadNotificationIds('student-2');
    expect(other.has(100)).toBe(false);
  });

  it('clears read ids on account reset', async () => {
    await persistReadNotificationId('student-2', 5);
    await clearReadNotificationIds('student-2');
    const ids = await loadReadNotificationIds('student-2');
    expect(ids.size).toBe(0);
  });
});
