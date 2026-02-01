import { apiClient } from '../api/config';

export interface ClassItem {
  id: string;
  name: string;
  label?: string;
  value?: string;
}

export interface SubjectItem {
  id: string;
  name: string;
  label?: string;
  value?: string;
}

export interface DropdownResponse<T> {
  items: T[];
  total?: number;
}

// Fallback data for classes
const FALLBACK_CLASSES: ClassItem[] = [
  { id: '1', name: 'Grade 1', value: '1', label: 'Grade 1' },
  { id: '2', name: 'Grade 2', value: '2', label: 'Grade 2' },
  { id: '3', name: 'Grade 3', value: '3', label: 'Grade 3' },
  { id: '4', name: 'Grade 4', value: '4', label: 'Grade 4' },
  { id: '5', name: 'Grade 5', value: '5', label: 'Grade 5' },
  { id: '6', name: 'Grade 6', value: '6', label: 'Grade 6' },
  { id: '7', name: 'Grade 7', value: '7', label: 'Grade 7' },
  { id: '8', name: 'Grade 8', value: '8', label: 'Grade 8' },
  { id: '9', name: 'Grade 9', value: '9', label: 'Grade 9' },
  { id: '10', name: 'Grade 10', value: '10', label: 'Grade 10' },
  { id: '11', name: 'Grade 11', value: '11', label: 'Grade 11' },
  { id: '12', name: 'Grade 12', value: '12', label: 'Grade 12' },
  { id: 'college', name: 'College', value: 'college', label: 'College' },
  { id: 'university', name: 'University', value: 'university', label: 'University' },
];

// Fallback data for subjects
const FALLBACK_SUBJECTS: SubjectItem[] = [
  { id: 'math', name: 'Mathematics', value: 'math', label: 'Mathematics' },
  { id: 'english', name: 'English', value: 'english', label: 'English' },
  { id: 'science', name: 'Science', value: 'science', label: 'Science' },
  { id: 'physics', name: 'Physics', value: 'physics', label: 'Physics' },
  { id: 'chemistry', name: 'Chemistry', value: 'chemistry', label: 'Chemistry' },
  { id: 'biology', name: 'Biology', value: 'biology', label: 'Biology' },
  { id: 'history', name: 'History', value: 'history', label: 'History' },
  { id: 'geography', name: 'Geography', value: 'geography', label: 'Geography' },
  { id: 'computer_science', name: 'Computer Science', value: 'computer_science', label: 'Computer Science' },
  { id: 'literature', name: 'Literature', value: 'literature', label: 'Literature' },
  { id: 'arts', name: 'Arts', value: 'arts', label: 'Arts' },
  { id: 'physical_education', name: 'Physical Education', value: 'physical_education', label: 'Physical Education' },
  { id: 'other', name: 'Other', value: 'other', label: 'Other' },
];

// Get list of classes/grades from instructor dashboard
export async function getClasses(): Promise<DropdownResponse<ClassItem>> {
  console.log('📚 [getClasses] Starting API call to /api/v1/dropdowns/classes');
  try {
    // Use the dashboard classes endpoint
    const response = await apiClient.get('/api/v1/dropdowns/classes');
    console.log('✅ [getClasses] API Response received:', response.data);
    
    // Transform the response to match our ClassItem interface
    // API returns: { items: [{ id, label, slug, meta }] }
    const classes = response.data.items.map((cls: any) => ({
      id: cls.id.toString(),
      name: cls.label,
      value: cls.id.toString(),
      label: cls.label,
      slug: cls.slug,
    }));
    
    //console.log(`✅ [getClasses] Successfully loaded ${classes.length} classes from API`);
    return { items: classes, total: response.data.items.length };
  } catch (error: any) {
    console.error('❌ [getClasses] API call failed:', error.message);
    console.error('❌ [getClasses] Error details:', error.response?.data || error);
    console.log('⚠️ [getClasses] Using fallback data');
    return { items: FALLBACK_CLASSES };
  }
}

// Get list of subjects - Load ALL subjects without pagination
export async function getSubjects(): Promise<DropdownResponse<SubjectItem>> {
  console.log('📖 [getSubjects] Starting API call to /api/v1/dropdowns/subjects/all');
  try {
    // Use the /all endpoint to get ALL subjects, not paginated
    const response = await apiClient.get('/api/v1/dropdowns/subjects/all');
    //console.log('✅ [getSubjects] API Response received:', response.data);
    
    // Transform the response to match our SubjectItem interface
    // API returns: { items: [{ id, label, slug, meta }] }
    const subjects = response.data.items.map((subj: any) => ({
      id: subj.id.toString(),
      name: subj.label,
      value: subj.id.toString(),
      label: subj.label,
      slug: subj.slug,
    }));
    
    console.log(`✅ [getSubjects] Successfully loaded ${subjects.length} subjects from API`);
    return { items: subjects, total: response.data.items.length };
  } catch (error: any) {
    console.error('❌ [getSubjects] API call failed:', error.message);
    console.error('❌ [getSubjects] Error details:', error.response?.data || error);
    console.log('⚠️ [getSubjects] Using fallback data');
    return { items: FALLBACK_SUBJECTS };
  }
}

// Get subjects by class/grade
export async function getSubjectsByClass(classId: string): Promise<DropdownResponse<SubjectItem>> {
  console.log(`📖 [getSubjectsByClass] Starting API call for classId: ${classId}`);
  try {
    const response = await apiClient.get(`/api/v1/dropdowns/classes/${classId}/subjects`);
    //console.log('✅ [getSubjectsByClass] API Response received:', response.data);
    
    // Transform the response to match our SubjectItem interface
    const subjects = response.data.items.map((subj: any) => ({
      id: subj.id.toString(),
      name: subj.label,
      value: subj.id.toString(),
      label: subj.label,
      slug: subj.slug,
    }));
    
    //console.log(`✅ [getSubjectsByClass] Successfully loaded ${subjects.length} subjects for class ${classId}`);
    return { items: subjects, total: response.data.items.length };
  } catch (error: any) {
    console.error(`❌ [getSubjectsByClass] API call failed for classId ${classId}:`, error.message);
    console.error('❌ [getSubjectsByClass] Error details:', error.response?.data || error);
    console.log('⚠️ [getSubjectsByClass] Using fallback data');
    return { items: FALLBACK_SUBJECTS };
  }
}

// Get difficulty levels
export async function getDifficultyLevels(): Promise<DropdownResponse<{ id: string; name: string; }>> {
  console.log('🎯 [getDifficultyLevels] Starting API call to /api/v1/dropdowns/levels');
  try {
    const response = await apiClient.get('/api/v1/dropdowns/levels');
    console.log('✅ [getDifficultyLevels] API Response received:', response.data);
    
    // Transform the response to match our interface
    // API returns: { items: [{ id, label, slug, meta }] }
    const levels = response.data.items.map((level: any) => ({
      id: level.id.toString(),
      name: level.label,
      slug: level.slug,
    }));
    
    console.log(`✅ [getDifficultyLevels] Successfully loaded ${levels.length} difficulty levels from API`);
    return { items: levels, total: response.data.items.length };
  } catch (error: any) {
    console.error('❌ [getDifficultyLevels] API call failed:', error.message);
    console.error('❌ [getDifficultyLevels] Error details:', error.response?.data || error);
    console.log('⚠️ [getDifficultyLevels] Using fallback data');
    return {
      items: [
        { id: '1', name: 'Beginner' },
        { id: '2', name: 'Elementary' },
        { id: '3', name: 'Intermediate' },
        { id: '4', name: 'Upper Intermediate' },
        { id: '5', name: 'Advanced' },
        { id: '6', name: 'Expert' },
        { id: '7', name: 'Master' },
      ]
    };
  }
}

// Get student levels (for YouTube, Image, Website quizzes)
export async function getStudentLevels(): Promise<DropdownResponse<{ id: string; name: string; label?: string; value?: string; }>> {
  return {
    items: [
      { id: 'elementary', name: 'Elementary School', value: 'elementary', label: 'Elementary School' },
      { id: 'middle_school', name: 'Middle School', value: 'middle_school', label: 'Middle School' },
      { id: 'high', name: 'High School', value: 'high', label: 'High School' },
      { id: 'college', name: 'College/University', value: 'college', label: 'College/University' },
    ]
  };
}

// Search dropdown items (classes or subjects)
export async function searchDropdown(
  dropdownType: 'classes' | 'subjects',
  searchQuery: string,
  limit: number = 10
): Promise<ClassItem[] | SubjectItem[]> {
  try {
    console.log(`🔍 Searching ${dropdownType} for: "${searchQuery}"`);

    // API limit constraint: max 20
    const queryParams = new URLSearchParams({
      q: searchQuery.trim(),
      limit: Math.min(limit, 20).toString()
    });
    
    const response = await apiClient.get(
      `/api/v1/dropdowns/search/${dropdownType}?${queryParams.toString()}`
    );
    
    // Handle both array response and object with items property
    const data = Array.isArray(response.data) ? response.data : (response.data.items || []);
    
    // Transform the response to match our interface
    const items = data.map((item: any) => ({
      id: item.id.toString(),
      name: item.label || item.name,
      value: item.id.toString(),
      label: item.label || item.name,
      slug: item.slug,
    }));
    
    return items;
  } catch (error: any) {
    // Log detailed error for debugging
    if (error.response?.status === 422) {
      console.error(`❌ Search validation error:`, JSON.stringify(error.response?.data, null, 2));
    }
    
    // Fallback 1: Try getting all items and filter locally
    try {
      console.log(`🔄 Attempting local filter from all ${dropdownType}...`);
      
      const allItemsResponse = dropdownType === 'classes' 
        ? await getClasses()
        : await getSubjects();
      
      const query = searchQuery.toLowerCase().trim();
      const filtered = allItemsResponse.items.filter((item: ClassItem | SubjectItem) =>
        item.name.toLowerCase().includes(query) ||
        item.label?.toLowerCase().includes(query) ||
        item.value?.toLowerCase().includes(query)
      );
      
      console.log(`✅ Local filter found ${filtered.length} items`);
      return filtered.slice(0, limit);
      
    } catch (fallbackError) {
      console.error(`❌ Fallback to API list failed:`, fallbackError);
      
      // Fallback 2: Use hardcoded fallback data
      const fallbackData = dropdownType === 'classes' ? FALLBACK_CLASSES : FALLBACK_SUBJECTS;
      const query = searchQuery.toLowerCase().trim();
      
      const filtered = fallbackData.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.label?.toLowerCase().includes(query) ||
          item.value?.toLowerCase().includes(query)
      );
      
      console.log(`⚠️ Using hardcoded fallback, found ${filtered.length} items`);
      return filtered.slice(0, limit);
    }
  }
}

// Advanced search with pagination and filters
export async function searchDropdownAdvanced(
  dropdownType: 'classes' | 'subjects',
  params: {
    q: string;
    page?: number;
    per_page?: number;
    exact?: boolean;
    class_id?: string; // Only for subjects search
  }
): Promise<DropdownResponse<ClassItem | SubjectItem>> {
  try {
    // Build query string with proper validation
    const queryParams = new URLSearchParams();
    queryParams.append('q', params.q.trim());
    if (params.page && params.page > 0) queryParams.append('page', params.page.toString());
    if (params.per_page) queryParams.append('per_page', Math.min(params.per_page, 20).toString());
    if (params.exact !== undefined) queryParams.append('exact', params.exact.toString());
    if (params.class_id && dropdownType === 'subjects') {
      queryParams.append('class_id', params.class_id);
    }
    
    const response = await apiClient.get(
      `/api/v1/dropdowns/search/${dropdownType}?${queryParams.toString()}`
    );
    
    // Handle both array response and object with items property
    const data = Array.isArray(response.data) ? response.data : (response.data.items || []);
    
    // Transform the response
    const items = data.map((item: any) => ({
      id: item.id.toString(),
      name: item.label || item.name,
      value: item.id.toString(),
      label: item.label || item.name,
      slug: item.slug,
    }));
    
    return {
      items,
      total: response.data.total || items.length,
    };
  } catch (error: any) {
    console.error(`Advanced search ${dropdownType} API error:`, error.response?.data || error.message);
    
    // Fallback to simple search
    const items = await searchDropdown(dropdownType, params.q, params.per_page || 10);
    return {
      items: items as any,
      total: items.length,
    };
  }
}
