import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MOBILE_PENDING_NOTIFICATION_KEY,
  MOBILE_PENDING_NOTIFICATION_MAX_AGE_MS,
  clearStoredPendingNotification,
  normalizeStoredPendingNotification,
  readStoredPendingNotification,
  writeStoredPendingNotification,
} from '../core/navigation/mobilePendingNotificationStorage';

const getItem = AsyncStorage.getItem as jest.Mock;
const setItem = AsyncStorage.setItem as jest.Mock;
const removeItem = AsyncStorage.removeItem as jest.Mock;

describe('durable pending assessment notification intent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getItem.mockResolvedValue(null);
    setItem.mockResolvedValue(undefined);
    removeItem.mockResolvedValue(undefined);
  });

  it('persists only recognized routing fields, not credentials', async () => {
    await writeStoredPendingNotification({
      type:'quiz_graded',quizId:'9',sessionId:'sess-9',studentId:'s1',
      eventKey:'quiz_graded:9:s1',notificationId:'apns-1',
    });
    const encoded = setItem.mock.calls[0][1] as string;
    expect(setItem.mock.calls[0][0]).toBe(MOBILE_PENDING_NOTIFICATION_KEY);
    const stored = JSON.parse(encoded);
    expect(stored.intent.type).toBe('quiz_graded');
    expect(stored.intent.quizId).toBe('9');
    expect(stored.intent.eventKey).toBe('quiz_graded:9:s1');
    expect(encoded).not.toMatch(/fcmToken|accessToken|password/i);
  });

  it('hydrates valid signed-out destination on cold start', async () => {
    const now = new Date().toISOString();
    getItem.mockResolvedValueOnce(JSON.stringify({
      queuedAtIso:now,
      intent:{type:'quiz_assigned',sessionId:'sess-1',quizId:'9'},
    }));
    await expect(readStoredPendingNotification()).resolves.toMatchObject({
      type:'quiz_assigned',sessionId:'sess-1',quizId:'9',
    });
  });

  it('rejects expired, future, unsupported or malformed storage', () => {
    const nowMs = Date.now();
    expect(normalizeStoredPendingNotification({
      queuedAtIso:new Date(nowMs-MOBILE_PENDING_NOTIFICATION_MAX_AGE_MS-1).toISOString(),
      intent:{type:'quiz_assigned',sessionId:'sess-1'},
    },nowMs)).toBeNull();
    expect(normalizeStoredPendingNotification({
      queuedAtIso:new Date(nowMs+61_000).toISOString(),
      intent:{type:'quiz_assigned',sessionId:'sess-1'},
    },nowMs)).toBeNull();
    expect(normalizeStoredPendingNotification({
      queuedAtIso:new Date(nowMs).toISOString(),
      intent:{type:'unknown_route',sessionId:'sess-1'},
    },nowMs)).toBeNull();
    expect(normalizeStoredPendingNotification({intent:{type:'quiz_assigned'}})).toBeNull();
  });

  it('does not erase a new notification when older resume completes', async () => {
    getItem.mockResolvedValueOnce(JSON.stringify({
      queuedAtIso:new Date().toISOString(),
      intent:{type:'quiz_completed',studentId:'s1',eventKey:'new-event'},
    }));
    await clearStoredPendingNotification('quiz_graded|old-event');
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('clears matching pending intent after navigation', async () => {
    getItem.mockResolvedValueOnce(JSON.stringify({
      queuedAtIso:new Date().toISOString(),
      intent:{type:'quiz_completed',studentId:'s1',eventKey:'new-event'},
    }));
    await clearStoredPendingNotification('quiz_completed|||||new-event');
    expect(removeItem).toHaveBeenCalledWith(MOBILE_PENDING_NOTIFICATION_KEY);
  });
});
