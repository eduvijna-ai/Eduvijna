# 📱 How to Test Mobile Push Notifications

## Prerequisites
- Physical Android/iOS device (emulators don't support push notifications)
- Device connected via USB or on same WiFi
- Firebase project set up with your app added

## Step 1: Run Test Screen

I've created a test screen at `src/screens/TestNotifications.tsx`. Access it by:

**Option A - Add to Profile (Temporary):**
Add this button to your Profile screen:
```typescript
<TouchableOpacity 
  onPress={() => navigation.navigate('TestNotifications')}
  style={{ padding: 16, backgroundColor: '#3B82F6', borderRadius: 8 }}
>
  <Text style={{ color: '#FFF', fontWeight: '600' }}>Test Notifications</Text>
</TouchableOpacity>
```

**Option B - Direct Navigation:**
Add the screen to your navigation stack and navigate to it.

## Step 2: Get Device Token

1. Open the TestNotifications screen on your mobile device
2. Allow notification permissions when prompted
3. Copy the device token displayed (long string starting with ExponentPushToken[...])
4. Save this token - you'll need it for testing

## Step 3: Test Local Notification

Click "Send Local Notification" button in the test screen. You should see a notification immediately.

If this works ✅, your device is configured correctly!

## Step 4: Backend Registration

Your backend needs to create this endpoint:

```typescript
POST /api/v1/notifications/device/register
{
  "user_id": 123,
  "device_token": "ExponentPushToken[xxxxx]",
  "platform": "android" // or "ios"
}
```

This stores the device token in the database.

## Step 5: Send Test from Backend

Backend can test sending notifications:

**Using Expo Push Notifications API:**
```bash
curl -H "Content-Type: application/json" \
  -X POST https://exp.host/--/api/v2/push/send \
  -d '{
    "to": "ExponentPushToken[YOUR_TOKEN_HERE]",
    "title": "Test Quiz Notification",
    "body": "Your Algebra quiz is ready!",
    "data": { "quiz_id": 123 }
  }'
```

**Or from Firebase Console:**
1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter title and message
4. Select your app
5. Click "Send test message"
6. Enter your device token
7. Click "Test"

## Step 6: Test End-to-End

1. Create a quiz on web/another device
2. Backend should:
   - Create notification in database
   - Send push notification via Expo API or Firebase
3. Your mobile device receives the notification
4. Click notification → opens app
5. Navigate to quiz screen

## Backend Implementation Needed

Your backend team needs to:

### 1. Device Registration Endpoint
```python
@app.post("/api/v1/notifications/device/register")
async def register_device(
    user_id: int,
    device_token: str,
    platform: str  # "android" or "ios"
):
    # Store in database
    db.execute(
        "INSERT INTO device_tokens (user_id, token, platform) VALUES (?, ?, ?)",
        (user_id, device_token, platform)
    )
```

### 2. Send Notification Function
```python
import requests

def send_push_notification(user_id: int, title: str, message: str, data: dict):
    # Get user's device tokens
    tokens = db.execute(
        "SELECT token FROM device_tokens WHERE user_id = ?",
        (user_id,)
    ).fetchall()
    
    for token in tokens:
        # Send via Expo Push API
        requests.post(
            "https://exp.host/--/api/v2/push/send",
            json={
                "to": token,
                "title": title,
                "body": message,
                "data": data,
                "sound": "default",
                "priority": "high"
            }
        )
```

### 3. Trigger on Quiz Events
```python
@app.post("/api/v1/quiz/generate")
async def generate_quiz(...):
    # Generate quiz
    quiz = create_quiz(...)
    
    # Send notification to students
    students = get_classroom_students(classroom_id)
    for student in students:
        send_push_notification(
            user_id=student.id,
            title="New Quiz Assigned",
            message=f"{quiz.title} is ready!",
            data={"quiz_id": quiz.id, "type": "quiz_assigned"}
        )
```

## Troubleshooting

### "Must use physical device"
- Emulators/simulators don't support push notifications
- Use real Android/iOS device

### "Permission denied"
- Check device notification settings
- Restart app and allow permissions

### Token not appearing
- Check console logs for errors
- Ensure projectId in app.json matches Firebase
- Try reinstalling the app

### Not receiving notifications
1. Check device token is saved in backend
2. Verify backend is calling Expo Push API correctly
3. Check Firebase credentials
4. Ensure device has internet connection
5. Check notification permissions in device settings

## Quick Test Checklist

- [ ] Physical device connected
- [ ] App running on device
- [ ] Notification permission granted
- [ ] Device token copied
- [ ] Local notification works (button in test screen)
- [ ] Backend has device registration endpoint
- [ ] Backend stores device token
- [ ] Backend can send push notifications
- [ ] End-to-end test (create quiz → receive notification)

---

**Next Steps:**
1. Run the test screen on your device
2. Get your device token
3. Share token with backend team
4. Backend implements the endpoints above
5. Test creating a quiz and receiving notification
