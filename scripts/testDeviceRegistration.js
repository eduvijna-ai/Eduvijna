/**
 * Test Device Registration
 * Tests the complete push notification flow:
 * 1. Login
 * 2. Register device token
 * 3. Send test notification
 */

const axios = require('axios');

// CONFIGURATION
const API_URL = 'https://api.eduvijna.com';
const USERNAME = 'sam';
const PASSWORD = 'Welcome@123';

// Mock device token (for testing)
const MOCK_EXPO_TOKEN = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';

let AUTH_TOKEN = null;
let USER_ID = null;
let DEVICE_ID = null;

async function login() {
  try {
    console.log('🔐 Logging in...');
    
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
      console.log(`   Token: ${AUTH_TOKEN.substring(0, 30)}...\n`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Login error:', error.response?.data || error.message);
    return false;
  }
}

async function registerDevice() {
  try {
    console.log('📱 Registering device...');
    
    const deviceData = {
      token: MOCK_EXPO_TOKEN,
      platform: 'android',
      device_name: 'Test Android Device',
      device_model: 'Pixel 6',
      os_version: '13',
      app_version: '1.0.0',
    };
    
    console.log('   Device data:', JSON.stringify(deviceData, null, 2));
    
    // Try different endpoints
    const endpoints = [
      '/api/notifications/devices',
      '/api/v1/notifications/devices',
      '/api/notifications/devices/register',
      '/api/v1/notifications/devices/register',
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`\n   Trying: ${endpoint}`);
        
        const response = await axios.post(
          `${API_URL}${endpoint}`,
          deviceData,
          {
            headers: {
              'Authorization': `Bearer ${AUTH_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('   ✅ Success!');
        console.log('   Status:', response.status);
        console.log('   Response:', JSON.stringify(response.data, null, 2));
        
        DEVICE_ID = response.data?.id;
        return true;
      } catch (error) {
        if (error.response?.status === 404) {
          console.log(`   ❌ 404 - Not found`);
          continue;
        } else {
          console.log(`   ❌ Error:`, error.response?.status, error.response?.data);
          if (error.response?.status !== 404) {
            // Show detailed error for non-404s
            console.log('   Details:', JSON.stringify(error.response?.data, null, 2));
          }
          continue;
        }
      }
    }
    
    console.log('\n❌ All endpoints failed!');
    return false;
  } catch (error) {
    console.error('❌ Device registration error:', error.message);
    return false;
  }
}

async function sendTestNotification() {
  try {
    console.log('\n📤 Sending test notification...');
    
    const response = await axios.post(
      `${API_URL}/api/notifications/send`,
      {
        user_ids: [USER_ID],
        title: '🧪 Test Notification After Device Registration',
        body: 'If you see this on your device, push notifications are working!',
        priority: 'high',
      },
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Notification sent!');
    console.log('   Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Send notification error:', error.response?.data || error.message);
    return false;
  }
}

async function listDevices() {
  try {
    console.log('\n📋 Listing registered devices...');
    
    const endpoints = [
      '/api/notifications/devices',
      '/api/v1/notifications/devices',
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`   Trying: ${endpoint}`);
        
        const response = await axios.get(
          `${API_URL}${endpoint}`,
          {
            headers: {
              'Authorization': `Bearer ${AUTH_TOKEN}`,
            },
          }
        );

        console.log('   ✅ Success!');
        console.log('   Devices:', JSON.stringify(response.data, null, 2));
        return true;
      } catch (error) {
        if (error.response?.status !== 404) {
          console.log(`   ❌ Error:`, error.response?.status);
        }
      }
    }
    
    console.log('   ❌ List devices endpoint not found');
    return false;
  } catch (error) {
    console.error('❌ List devices error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Push Notification Device Registration Test\n');
  console.log('='.repeat(60));
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ Login failed. Stopping tests.');
    return;
  }
  
  // Step 2: Register device
  const registerSuccess = await registerDevice();
  if (!registerSuccess) {
    console.log('\n❌ Device registration failed.');
    console.log('\n💡 The backend may not have the device registration endpoint implemented.');
    console.log('   Expected endpoints:');
    console.log('   - POST /api/notifications/devices');
    console.log('   - POST /api/v1/notifications/devices');
  }
  
  // Step 3: List devices
  await listDevices();
  
  // Step 4: Send test notification
  await sendTestNotification();
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ Test complete!\n');
  
  if (registerSuccess) {
    console.log('📱 Next steps:');
    console.log('   1. Enable push notifications in the mobile app');
    console.log('   2. The app will register your real device token');
    console.log('   3. Send a notification via the API');
    console.log('   4. You should receive it on your device!');
  } else {
    console.log('⚠️  Device registration endpoint needs to be implemented on backend');
    console.log('   Without this, the app cannot register device tokens for push notifications.');
  }
}

runTests();
