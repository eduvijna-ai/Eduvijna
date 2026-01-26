/**
 * MANUAL REFRESH WITH CACHE - Example Implementation
 * 
 * This example shows how to implement pull-to-refresh functionality
 * that clears the cache and fetches fresh data.
 * 
 * Two approaches:
 * 1. Using forceRefresh parameter (recommended)
 * 2. Using clearApiCache() function (for clearing all data)
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  RefreshControl, 
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { 
  fetchTeacherDashboardSummary,
  clearApiCache,
  clearCacheEntry,
  TeacherQuizFilters,
  DashboardApiResponse,
  TeacherQuiz
} from '../core/services/dashboardApi';

/**
 * METHOD 1: Using forceRefresh Parameter (RECOMMENDED)
 * This bypasses the cache for a single API call without affecting other cached data
 */
export function DashboardWithForceRefresh() {
  const [data, setData] = useState<DashboardApiResponse<TeacherQuiz> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Initial load - uses cache if available
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetchTeacherDashboardSummary();
      setData(response);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Pull-to-refresh - forces fresh data
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      
      // forceRefresh = true bypasses cache for this call only
      const response = await fetchTeacherDashboardSummary({}, true);
      setData(response);
      
      console.log('✅ Data refreshed with fresh API call');
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5B21B6" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={handleRefresh}
          colors={['#5B21B6']} // Android
          tintColor="#5B21B6"   // iOS
        />
      }
    >
      <Text style={styles.title}>Teacher Dashboard</Text>
      <Text style={styles.subtitle}>Pull down to refresh</Text>
      
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          Total Quizzes: {data?.data?.length || 0}
        </Text>
      </View>

      {/* Quiz list */}
      {data?.data?.map((quiz, index) => (
        <View key={index} style={styles.quizCard}>
          <Text style={styles.quizTitle}>{quiz.title || 'Quiz ' + (index + 1)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

/**
 * METHOD 2: Clearing Entire Cache
 * Use this when you want to clear ALL cached data and fetch everything fresh
 */
export function DashboardWithFullCacheClear() {
  const [data, setData] = useState<DashboardApiResponse<TeacherQuiz> | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const response = await fetchTeacherDashboardSummary();
    setData(response);
  };

  const handleRefreshAll = async () => {
    try {
      setRefreshing(true);
      
      // Clear ALL cached data from ALL APIs
      clearApiCache();
      console.log('🗑️ All API cache cleared');
      
      // Now fetch fresh data
      await loadData();
      
      console.log('✅ All data refreshed');
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefreshAll} />
      }
    >
      <Text style={styles.title}>Dashboard (Full Cache Clear)</Text>
      {/* Content */}
    </ScrollView>
  );
}

/**
 * METHOD 3: Clearing Specific Cache Entry
 * Use this when you want to refresh only specific data without affecting other caches
 */
export function DashboardWithSpecificCacheClear() {
  const [data, setData] = useState<DashboardApiResponse<TeacherQuiz> | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshSpecific = async () => {
    try {
      setRefreshing(true);
      
      // Clear only the dashboard summary cache
      // Note: You need to know the exact cache key format
      const filters: TeacherQuizFilters = { limit: 10, offset: 0 };
      const cacheKey = `teacher_summary_${JSON.stringify(filters)}`;
      
      clearCacheEntry(cacheKey);
      console.log(`🗑️ Cache entry cleared: ${cacheKey}`);
      
      // Fetch fresh data
      const response = await fetchTeacherDashboardSummary(filters);
      setData(response);
      
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefreshSpecific} />
      }
    >
      <Text style={styles.title}>Dashboard (Specific Cache Clear)</Text>
      {/* Content */}
    </ScrollView>
  );
}

/**
 * METHOD 4: Manual Refresh Button
 * Shows a refresh button in the UI instead of pull-to-refresh
 */
export function DashboardWithRefreshButton() {
  const [data, setData] = useState<DashboardApiResponse<TeacherQuiz> | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const response = await fetchTeacherDashboardSummary({}, forceRefresh);
      setData(response);
      
      if (forceRefresh) {
        setLastRefreshed(new Date());
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = () => {
    loadData(true); // Force refresh
  };

  return (
    <View style={styles.container}>
      {/* Header with refresh button */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.lastRefreshed}>
            Last updated: {lastRefreshed.toLocaleTimeString()}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={handleManualRefresh}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#5B21B6" />
          ) : (
            <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {data?.data?.map((quiz, index) => (
          <View key={index} style={styles.quizCard}>
            <Text style={styles.quizTitle}>{quiz.title || 'Quiz ' + (index + 1)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * METHOD 5: Automatic Refresh After Data Mutation
 * Refresh cache after creating, updating, or deleting data
 */
export function DashboardWithAutoRefresh() {
  const [data, setData] = useState<DashboardApiResponse<TeacherQuiz> | null>(null);

  const handleCreateQuiz = async (quizData: any) => {
    try {
      // 1. Create the quiz via API
      // await createQuizAPI(quizData);
      
      // 2. Clear the cache to remove stale data
      clearApiCache();
      
      // 3. Fetch fresh data (will not use cache since we just cleared it)
      const response = await fetchTeacherDashboardSummary();
      setData(response);
      
      console.log('✅ Quiz created and dashboard refreshed');
    } catch (error) {
      console.error('Error creating quiz:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard (Auto Refresh)</Text>
      <TouchableOpacity 
        style={styles.createButton}
        onPress={() => handleCreateQuiz({ title: 'New Quiz' })}
      >
        <Text style={styles.createButtonText}>+ Create Quiz</Text>
      </TouchableOpacity>
      
      {/* Content */}
    </View>
  );
}

/**
 * COMPARISON: When to use each method
 * 
 * 1. forceRefresh Parameter (RECOMMENDED for most cases)
 *    ✅ Use for: Pull-to-refresh, manual refresh button
 *    ✅ Pros: Simple, doesn't affect other cached data
 *    ❌ Cons: Only refreshes one API endpoint
 * 
 * 2. clearApiCache() (Use for complete reset)
 *    ✅ Use for: Logout, switch accounts, reset app state
 *    ✅ Pros: Clears all cached data completely
 *    ❌ Cons: Forces all subsequent calls to hit the API
 * 
 * 3. clearCacheEntry() (Use for surgical updates)
 *    ✅ Use for: After creating/updating/deleting specific data
 *    ✅ Pros: Only affects specific cache entry
 *    ❌ Cons: Need to know exact cache key format
 * 
 * 4. Manual Refresh Button (Use for explicit control)
 *    ✅ Use for: When users want to manually refresh
 *    ✅ Pros: Gives users control, shows last refresh time
 *    ❌ Cons: Requires UI space
 * 
 * 5. Auto Refresh After Mutation (Use for data consistency)
 *    ✅ Use for: After create/update/delete operations
 *    ✅ Pros: Ensures UI is always in sync
 *    ❌ Cons: Extra API calls after mutations
 */

/**
 * BEST PRACTICES
 * 
 * 1. Use forceRefresh for user-initiated refreshes
 *    await fetchTeacherDashboardSummary({}, true);
 * 
 * 2. Clear entire cache on logout
 *    clearApiCache();
 * 
 * 3. Clear specific entries after mutations
 *    clearCacheEntry(cacheKey);
 * 
 * 4. Show visual feedback during refresh
 *    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
 * 
 * 5. Display last refresh time for transparency
 *    Last updated: 2:30 PM
 */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  lastRefreshed: {
    fontSize: 12,
    color: '#6B7280',
  },
  refreshButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#5B21B6',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  statsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  quizCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quizTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  createButton: {
    backgroundColor: '#5B21B6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    margin: 16,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
