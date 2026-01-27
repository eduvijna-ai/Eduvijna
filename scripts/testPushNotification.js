/**
 * Test Push Notification Script
 * 
 * Usage:
 * 1. Install: npm install axios
 * 2. Update API_URL and AUTH_TOKEN below
 * 3. Run: node scripts/testPushNotification.js
 */

const axios = require('axios');

// CONFIGURATION - Update these values
const API_URL = 'https://api.eduvijna.com'; // Your API URL
const USERNAME = 'sam';
const PASSWORD = 'Welcome@123';

let AUTH_TOKEN = null;
let USER_ID = null;

// Test notification data
const testNotifications = [
  {
    title: '🎯 New Quiz Assigned',
    body: 'You have been assigned: Mathematics Chapter 5',
    priority: 'high',
  },
  {
    title: '📊 Quiz Results Available',
    body: 'Your score for Science Quiz: 85%',
    priority: 'normal',
  },
  {
    title: '⏰ Quiz Reminder',
    body: 'Don\'t forget! History Quiz is due tomorrow',
    priority: 'high',
  },
  {
    title: '🏆 Achievement Unlocked',
    body: 'You completed 10 quizzes! Keep it up!',
    priority: 'low',
  },
];

async function login() {
  try {
    console.log('🔐 Logging in...');
    console.log(`   Username: ${USERNAME}`);
    
    const response = await axios.post(
      `${API_URL}/api/v1/auth/login`,
      {
        username_or_email: USERNAME,
        password: PASSWORD,
        remember_me: false,
        device_info: 'Test Script'
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data.access_token) {
      AUTH_TOKEN = response.data.access_token;
      USER_ID = response.data.user?.id;
      
      console.log('✅ Login successful!');
      console.log(`   User ID: ${USER_ID}`);
      console.log(`   User Email: ${response.data.user?.email}`);
      console.log(`   User Role: ${response.data.user?.role}`);
      console.log(`   Token: ${AUTH_TOKEN.substring(0, 30)}...`);
      return true;
    } else {
      console.error('❌ Login failed: No access token in response');
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error.response?.data || error.message);
    return false;
  }
}

async function sendTestNotification(notification) {
  try {
    console.log(`\n📤 Sending: "${notification.title}"`);
    
    const response = await axios.post(
      `${API_URL}/api/notifications/send`,
      {
        user_ids: [13],  // API expects array of user IDs
        title: notification.title,
        body: notification.body,
        priority: notification.priority,
      },
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Success!');
    console.log('   Status:', response.status);
    console.log('   Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });
    return false;
  }
}

async function testAll() {
  console.log('🚀 Starting Push Notification Tests\n');
  
  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ Login failed. Cannot continue.');
    return;
  }
  
  console.log('\nConfiguration:');
  console.log(`  API: ${API_URL}`);
  console.log(`  User ID: ${USER_ID}`);
  console.log(`  Token: ${AUTH_TOKEN.substring(0, 20)}...`);
  console.log('\n' + '='.repeat(50));

  for (let i = 0; i < testNotifications.length; i++) {
    const notification = testNotifications[i];
    const success = await sendTestNotification(notification);
    
    if (!success) {
      console.log('\n❌ Test failed. Stopping.');
      break;
    }

    // Wait 2 seconds between notifications
    if (i < testNotifications.length - 1) {
      console.log('⏳ Waiting 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('✨ Test Complete!\n');
}

async function testSingle() {
  console.log('🚀 Sending Single Test Notification\n');
  
  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ Login failed. Cannot continue.');
    return;
  }
  
  console.log('');
  await sendTestNotification({
    title: '🧪 Test Notification',
    body: 'If you see this, push notifications are working!',
    priority: 'high',
  });
}

// Run tests
const mode = process.argv[2];

if (mode === 'all') {
  testAll();
} else {
  testSingle();
}

// Instructions
if (!AUTH_TOKEN || AUTH_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
  console.log('\n⚠️  Please update AUTH_TOKEN in this script first!\n');
  console.log('How to get your token:');
  console.log('1. Login to the app');
  console.log('2. Open React Native Debugger');
  console.log('3. Check AsyncStorage for "token" or "accessToken"');
  console.log('4. Copy the token value and paste it in this script\n');
}
