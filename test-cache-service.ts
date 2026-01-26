/**
 * Cache Service Test Script
 * 
 * Run this to verify caching functionality and see detailed logs
 * Shows: Cache hits, misses, API calls, and statistics
 */

import {
  initializeCache,
  cachedApiCall,
  getCachedData,
  setCachedData,
  clearAllCache,
  logCacheStatistics,
  CACHE_TTL,
} from './src/core/services/cacheService';

// Simulate API call
async function mockApiCall(endpoint: string, delay: number = 500): Promise<any> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        endpoint,
        timestamp: new Date().toISOString(),
        data: { message: `Data from ${endpoint}` },
      });
    }, delay);
  });
}

async function runCacheTests() {
  console.log('\n🧪 Starting Cache Service Tests...\n');

  // Initialize cache
  await initializeCache();
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('\n' + '='.repeat(70));
  console.log('TEST 1: First API Call (Cache Miss -> API Call)');
  console.log('='.repeat(70));
  
  const data1 = await cachedApiCall(
    () => mockApiCall('/api/dashboard'),
    'dashboard:test1',
    CACHE_TTL.DEFAULT
  );
  console.log('Result:', data1);

  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('\n' + '='.repeat(70));
  console.log('TEST 2: Second Call (Cache Hit -> No API Call)');
  console.log('='.repeat(70));
  
  const data2 = await cachedApiCall(
    () => mockApiCall('/api/dashboard'),
    'dashboard:test1',
    CACHE_TTL.DEFAULT
  );
  console.log('Result:', data2);

  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('\n' + '='.repeat(70));
  console.log('TEST 3: Force Refresh (Cache Bypassed -> API Call)');
  console.log('='.repeat(70));
  
  const data3 = await cachedApiCall(
    () => mockApiCall('/api/dashboard'),
    'dashboard:test1',
    CACHE_TTL.DEFAULT,
    true // Force refresh
  );
  console.log('Result:', data3);

  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('\n' + '='.repeat(70));
  console.log('TEST 4: Manual Cache Operations');
  console.log('='.repeat(70));
  
  // Set data manually
  await setCachedData('user:123', { name: 'John Doe', role: 'student' }, 300, 'MANUAL');
  
  // Get data
  const userData = await getCachedData('user:123');
  console.log('Retrieved user data:', userData);

  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('\n' + '='.repeat(70));
  console.log('TEST 5: Multiple Different API Calls');
  console.log('='.repeat(70));
  
  await Promise.all([
    cachedApiCall(() => mockApiCall('/api/quizzes'), 'quizzes:list', CACHE_TTL.QUIZZES_LIST),
    cachedApiCall(() => mockApiCall('/api/students'), 'students:list', CACHE_TTL.STUDENTS_LIST),
    cachedApiCall(() => mockApiCall('/api/classrooms'), 'classrooms:list', CACHE_TTL.CLASSROOMS),
  ]);

  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('\n' + '='.repeat(70));
  console.log('TEST 6: Cached Calls (All should hit cache)');
  console.log('='.repeat(70));
  
  await Promise.all([
    cachedApiCall(() => mockApiCall('/api/quizzes'), 'quizzes:list', CACHE_TTL.QUIZZES_LIST),
    cachedApiCall(() => mockApiCall('/api/students'), 'students:list', CACHE_TTL.STUDENTS_LIST),
    cachedApiCall(() => mockApiCall('/api/classrooms'), 'classrooms:list', CACHE_TTL.CLASSROOMS),
  ]);

  await new Promise(resolve => setTimeout(resolve, 100));

  // Show final statistics
  console.log('\n' + '='.repeat(70));
  console.log('FINAL CACHE STATISTICS');
  console.log('='.repeat(70));
  await logCacheStatistics();

  console.log('\n' + '='.repeat(70));
  console.log('TEST 7: Clear All Cache');
  console.log('='.repeat(70));
  
  await clearAllCache();

  console.log('\n✅ All tests completed!\n');
}

// Run tests
runCacheTests().catch(console.error);
