/**
 * Student Utilities
 * Common functions for working with student data
 */

/**
 * Extract unique students from classroom data
 * Handles deduplication when a student is enrolled in multiple classrooms
 * 
 * @param classroomsData - Array of classroom data from API (view_type=class_wise_students)
 * @returns Object with unique students array and total count
 */
export function extractUniqueStudents(classroomsData: any[]): {
  students: any[];
  totalCount: number;
} {
  // Use Map to deduplicate students across all classrooms
  // A student may be enrolled in multiple classes, but should only be counted once
  const uniqueStudentsMap = new Map<number, any>();
  
  classroomsData.forEach((classroom) => {
    if (classroom.attempts) {
      try {
        const students = typeof classroom.attempts === 'string'
          ? JSON.parse(classroom.attempts)
          : classroom.attempts;
        
        if (Array.isArray(students)) {
          // Add each student to map, using student_id as key for deduplication
          students.forEach((student: any) => {
            if (student.student_id && !uniqueStudentsMap.has(student.student_id)) {
              uniqueStudentsMap.set(student.student_id, student);
            }
          });
        }
      } catch (e) {
        console.error('Error parsing classroom students:', e);
      }
    }
  });
  
  const uniqueStudents = Array.from(uniqueStudentsMap.values());
  
  return {
    students: uniqueStudents,
    totalCount: uniqueStudents.length,
  };
}

/**
 * Get total unique student count from classroom data
 * Convenience function when you only need the count
 * 
 * @param classroomsData - Array of classroom data from API
 * @returns Total unique student count
 */
export function getUniqueStudentCount(classroomsData: any[]): number {
  return extractUniqueStudents(classroomsData).totalCount;
}

/**
 * Get students for a specific classroom
 * 
 * @param classroomData - Single classroom data object
 * @returns Array of students in the classroom
 */
export function getClassroomStudents(classroomData: any): any[] {
  if (!classroomData?.attempts) {
    return [];
  }
  
  try {
    const students = typeof classroomData.attempts === 'string'
      ? JSON.parse(classroomData.attempts)
      : classroomData.attempts;
    
    return Array.isArray(students) ? students : [];
  } catch (e) {
    console.error('Error parsing classroom students:', e);
    return [];
  }
}
