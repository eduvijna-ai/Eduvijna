import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadReadNotificationIds,
  persistReadNotificationId,
  clearReadNotificationIds,
} from '../core/api/notificationReadState';

const store: Record<string, string> = {};

describe('notificationReadState', () => {
  beforeEach(() => {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => store[key] ?? null);
    (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
      store[key] = value;
    });
    (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
      delete store[key];
    });
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
