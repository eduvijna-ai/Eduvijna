/**
 * Example: How to use fetchTeacherDashboardSummary() to fetch data ONCE and reuse it
 * This avoids multiple API calls for classes, quizzes, counts, statuses, etc.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { fetchTeacherDashboardSummary } from '@core/services/dashboardApi';
import type { DashboardApiResponse, TeacherQuiz, Classroom } from '@core/types/quiz.types';

export default function TeacherDashboardExample() {
  const [summaryData, setSummaryData] = useState<DashboardApiResponse<TeacherQuiz> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  /**
   * STEP 1: Fetch ALL data once with view_type=summary
   * This single API call includes:
   * - All quizzes
   * - All classes
   * - All counts (total, active, draft, completed)
   * - All statuses
   * - Everything except quiz attempts and student lists
   */
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      console.log('📊 Fetching dashboard summary (ONE API CALL)...');
      const data = await fetchTeacherDashboardSummary();
      
      // Store the data - we'll reuse it everywhere
      setSummaryData(data);
      
      console.log('✅ Got all data:', {
        totalQuizzes: data.data?.length,
        // Backend should provide aggregated data in the response
        // If not, we calculate client-side from the data array
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#5B21B6" />;
  }

  if (!summaryData) {
    return <Text>Failed to load dashboard</Text>;
  }

  /**
   * STEP 2: Extract and reuse data from the summary response
   * No additional API calls needed!
   */
  const quizzes = summaryData.data || [];
  
  // Calculate stats from the summary data
  const stats = {
    totalQuizzes: quizzes.length,
    activeQuizzes: quizzes.filter(q => q.status === 'active').length,
    draftQuizzes: quizzes.filter(q => q.status === 'draft').length,
    completedQuizzes: quizzes.filter(q => q.status === 'completed').length,
  };

  // Extract unique classes from quizzes
  const classesMap = new Map<string, Classroom>();
  quizzes.forEach(quiz => {
    if (quiz.classroom_id && quiz.classroom_name) {
      if (!classesMap.has(quiz.classroom_id)) {
        classesMap.set(quiz.classroom_id, {
          classroom_id: quiz.classroom_id,
          classroom_name: quiz.classroom_name,
          // Add more classroom fields as available from API
        } as Classroom);
      }
    }
  });
  const classes = Array.from(classesMap.values());

  // Get recent quizzes (already sorted by created_at from backend)
  const recentQuizzes = quizzes.slice(0, 5);

  // Get quizzes by status
  const activeQuizzes = quizzes.filter(q => q.status === 'active');
  const draftQuizzes = quizzes.filter(q => q.status === 'draft');

  return (
    <ScrollView>
      {/* Summary Cards - using data from ONE API call */}
      <View style={{ flexDirection: 'row', padding: 16, gap: 12 }}>
        <StatCard title="Total Quizzes" value={stats.totalQuizzes} />
        <StatCard title="Active" value={stats.activeQuizzes} />
        <StatCard title="Draft" value={stats.draftQuizzes} />
        <StatCard title="Classes" value={classes.length} />
      </View>

      {/* Recent Quizzes - using data from ONE API call */}
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
          Recent Quizzes
        </Text>
        {recentQuizzes.map(quiz => (
          <QuizCard key={quiz.quiz_id} quiz={quiz} />
        ))}
      </View>

      {/* Classes List - using data extracted from ONE API call */}
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
          Your Classes
        </Text>
        {classes.map(classroom => (
          <ClassCard 
            key={classroom.classroom_id} 
            classroom={classroom}
            quizCount={quizzes.filter(q => q.classroom_id === classroom.classroom_id).length}
          />
        ))}
      </View>

      {/* Active Quizzes - using filtered data from ONE API call */}
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
          Active Quizzes
        </Text>
        {activeQuizzes.map(quiz => (
          <QuizCard key={quiz.quiz_id} quiz={quiz} />
        ))}
      </View>

      {/* 
        Note: Student lists and quiz attempts require separate API calls
        because they're not included in the summary response
      */}
    </ScrollView>
  );
}

// Helper components
function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#F9FAFB', 
      padding: 16, 
      borderRadius: 8,
      alignItems: 'center' 
    }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#5B21B6' }}>
        {value}
      </Text>
      <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
        {title}
      </Text>
    </View>
  );
}

function QuizCard({ quiz }: { quiz: TeacherQuiz }) {
  return (
    <View style={{ 
      backgroundColor: '#FFFFFF', 
      padding: 12, 
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      marginBottom: 8
    }}>
      <Text style={{ fontSize: 14, fontWeight: '600' }}>{quiz.quiz_title}</Text>
      <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
        {quiz.classroom_name} • {quiz.status}
      </Text>
    </View>
  );
}

function ClassCard({ 
  classroom, 
  quizCount 
}: { 
  classroom: Classroom; 
  quizCount: number;
}) {
  return (
    <View style={{ 
      backgroundColor: '#FFFFFF', 
      padding: 12, 
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      marginBottom: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <Text style={{ fontSize: 14, fontWeight: '600' }}>
        {classroom.classroom_name}
      </Text>
      <Text style={{ fontSize: 12, color: '#6B7280' }}>
        {quizCount} quizzes
      </Text>
    </View>
  );
}

/**
 * BEST PRACTICE: Pass summary data to child components instead of refetching
 */

// ❌ BAD: Each component fetches data separately
function BadExample() {
  return (
    <View>
      <QuizzesList />  {/* Calls fetchTeacherQuizzes() */}
      <ClassesList />  {/* Calls fetchTeacherClassrooms() */}
      <StatsCards />   {/* Calls fetchTeacherQuizzes() again! */}
    </View>
  );
}

// ✅ GOOD: Fetch once, pass data down
function GoodExample() {
  const [summaryData, setSummaryData] = useState(null);

  useEffect(() => {
    // Fetch ONCE
    fetchTeacherDashboardSummary().then(setSummaryData);
  }, []);

  if (!summaryData) return <ActivityIndicator />;

  return (
    <View>
      {/* Pass the same data to all components */}
      <QuizzesList quizzes={summaryData.data} />
      <ClassesList quizzes={summaryData.data} />
      <StatsCards quizzes={summaryData.data} />
    </View>
  );
}

/**
 * WHEN TO USE SEPARATE API CALLS:
 * 
 * 1. Quiz Attempts - fetchQuizAttempts()
 *    - Not included in summary
 *    - Requires view_type=attempts
 * 
 * 2. Student Lists - fetchAllStudents() or fetchClassroomStudents()
 *    - Not included in summary
 *    - Requires view_type=all_students
 *    - Use pagination for large student lists
 * 
 * 3. Load More Quizzes - fetchTeacherQuizzes({ limit: 10, offset: 10 })
 *    - When user clicks "Load More"
 *    - Initial summary loads 1000, but for UX you might paginate
 */
