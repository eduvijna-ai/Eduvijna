import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoadingSpinner from './LoadingSpinner';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '@context/ThemeContext';
import { useDropdowns } from '../context/DropdownContext';
import { searchDropdown } from '../core/services/dropdown';

// Define interfaces for dropdown items
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

export interface QuizFormFieldsProps {
  // Class field
  showClass?: boolean;
  classValue?: string;
  onClassChange?: (value: string) => void;
  classes?: ClassItem[]; // Now optional - will load from API if not provided
  isLoadingClasses?: boolean;
  classError?: string;
  
  // Subject field
  showSubject?: boolean;
  subjectValue?: string;
  onSubjectChange?: (value: string) => void;
  subjects?: SubjectItem[]; // Now optional - will load from API if not provided
  isLoadingSubjects?: boolean;
  subjectError?: string;
  
  // Student Level field (alternative to class/subject for some quiz types)
  showStudentLevel?: boolean;
  studentLevelValue?: string;
  onStudentLevelChange?: (value: string) => void;
  studentLevels?: Array<{ id: string; name: string; label?: string; value?: string }>;
  isLoadingStudentLevels?: boolean;
  
  // Difficulty Level field
  showDifficultyLevel?: boolean;
  difficultyValue?: string;
  onDifficultyChange?: (value: string) => void;
  difficultyError?: string;
  difficultyLevels?: Array<{ id: string; name: string; label?: string; value?: string }>; // Now optional - will load from API if not provided
  
  // Number of Questions field
  showQuestionCount?: boolean;
  questionCountValue?: string;
  onQuestionCountChange?: (value: string) => void;
  questionCountError?: string;
  questionCountOptions?: string[];
  usePickerForCount?: boolean;
  
  // Lesson/Topic field
  showLesson?: boolean;
  lessonValue?: string;
  onLessonChange?: (value: string) => void;
  onLessonBlur?: (event: any) => void;
  lessonPlaceholder?: string;
  lessonLabel?: string;
  lessonError?: string;

  // Additional Instructions field
  showAdditionalInstructions?: boolean;
  additionalInstructionsValue?: string;
  onAdditionalInstructionsChange?: (value: string) => void;
  onAdditionalInstructionsBlur?: (event: any) => void;
  additionalInstructionsError?: string;

  // Compact sizing
  compact?: boolean;
}

export default function QuizFormFields(props: QuizFormFieldsProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  
  // Get dropdown data from context (loaded once for entire app)
  const {
    classes: contextClasses,
    isLoadingClasses: contextLoadingClasses,
    subjects: contextSubjects,
    isLoadingSubjects: contextLoadingSubjects,
    difficultyLevels: contextDifficultyLevels,
  } = useDropdowns();
  
  const {
    showClass = true,
    classValue = '',
    onClassChange,
    classes: propClasses,
    isLoadingClasses: propLoadingClasses,
    classError = '',
    
    showSubject = true,
    subjectValue = '',
    onSubjectChange,
    subjects: propSubjects,
    isLoadingSubjects: propLoadingSubjects,
    subjectError = '',
    
    showStudentLevel = false,
    studentLevelValue = '',
    onStudentLevelChange,
    studentLevels = [],
    isLoadingStudentLevels = false,
    
    showDifficultyLevel = false,
    difficultyValue = '',
    onDifficultyChange,
    difficultyError = '',
    difficultyLevels: propDifficultyLevels,
    
    showQuestionCount = false,
    questionCountValue = '5',
    onQuestionCountChange,
    questionCountError = '',
    questionCountOptions = ['3', '5', '10', '15', '20'],
    usePickerForCount = true,
    
    showLesson = false,
    lessonValue = '',
    onLessonChange,
    onLessonBlur,
    lessonPlaceholder = 'Enter lesson or topic name',
    lessonLabel = 'Lesson/Topic',
    lessonError = '',

    showAdditionalInstructions = true,
    additionalInstructionsValue = '',
    onAdditionalInstructionsChange,
    onAdditionalInstructionsBlur,
    additionalInstructionsError = '',

    compact = false,
  } = props;

  // Use prop data if provided, otherwise use context data (loaded once for entire app)
  const rawClasses = propClasses || contextClasses;
  const rawSubjects = propSubjects || contextSubjects;
  const normalizeDropdownItems = <T extends { id?: string; name?: string; label?: string; value?: string }>(items: T[]): T[] =>
    (items || []).filter((item) => Boolean(item?.id) && Boolean(item?.name || item?.label || item?.value));

  const classes = useMemo(
    () =>
      normalizeDropdownItems(rawClasses as ClassItem[]).map((item) => ({
        ...item,
        name: item.name || item.label || item.value || '',
      })),
    [rawClasses]
  );
  const subjects = useMemo(
    () =>
      normalizeDropdownItems(rawSubjects as SubjectItem[]).map((item) => ({
        ...item,
        name: item.name || item.label || item.value || '',
      })),
    [rawSubjects]
  );
  const difficultyLevels = propDifficultyLevels || contextDifficultyLevels;
  const isLoadingClasses = propLoadingClasses ?? contextLoadingClasses;
  const isLoadingSubjects = propLoadingSubjects ?? contextLoadingSubjects;

  // State for search functionality
  const [classSearchQuery, setClassSearchQuery] = useState('');
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
  const [filteredClasses, setFilteredClasses] = useState<ClassItem[]>(classes);
  const [filteredSubjects, setFilteredSubjects] = useState<SubjectItem[]>(subjects);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [showQuestionCountModal, setShowQuestionCountModal] = useState(false);
  const [isSearchingClasses, setIsSearchingClasses] = useState(false);
  const [isSearchingSubjects, setIsSearchingSubjects] = useState(false);

  // Debounce timers
  const classSearchTimer = useRef<NodeJS.Timeout | null>(null);
  const subjectSearchTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize filtered lists when data changes
  useEffect(() => {
    setFilteredClasses(classes);
  }, [classes]);

  useEffect(() => {
    setFilteredSubjects(subjects);
  }, [subjects]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (classSearchTimer.current) clearTimeout(classSearchTimer.current);
      if (subjectSearchTimer.current) clearTimeout(subjectSearchTimer.current);
    };
  }, []);

  // Handle class search with debounce
  const handleClassSearch = useCallback((query: string) => {
    setClassSearchQuery(query);
    
    // Clear existing timer
    if (classSearchTimer.current) {
      clearTimeout(classSearchTimer.current);
    }
    
    // If less than 3 characters, show all classes (local filter)
    if (query.length < 3) {
      let filtered = classes.filter((c) => {
        const name = (c?.name || '').toLowerCase();
        const label = (c?.label || '').toLowerCase();
        const value = (c?.value || '').toLowerCase();
        const q = query.toLowerCase();
        return name.includes(q) || label.includes(q) || value.includes(q);
      });
      
      // Always include the currently selected class, even if it doesn't match the search
      if (classValue) {
        const selectedClass = classes.find(c => c.id === classValue);
        if (selectedClass && !filtered.find(c => c.id === classValue)) {
          filtered = [selectedClass, ...filtered];
        }
      }
      
      setFilteredClasses(filtered);
      setIsSearchingClasses(false);
      return;
    }
    
    // Set searching state
    setIsSearchingClasses(true);
    
    // Debounce API search - wait 300ms after user stops typing
    classSearchTimer.current = setTimeout(async () => {
      try {
        const q = query.toLowerCase();
        const results = (await searchDropdown('classes', query, 10)).filter(
          (item: any) => item?.id && (item?.name || item?.label || item?.value)
        ).filter((item: any) => {
          const name = (item?.name || '').toLowerCase();
          const label = (item?.label || '').toLowerCase();
          const value = (item?.value || '').toLowerCase();
          return name.includes(q) || label.includes(q) || value.includes(q);
        });
        
        // Always include the currently selected class, even if it's not in search results
        let finalResults = [...results];
        if (classValue) {
          const selectedClass = classes.find(c => c.id === classValue);
          if (selectedClass && !finalResults.find(c => c.id === classValue)) {
            finalResults = [selectedClass, ...finalResults];
          }
        }
        
        setFilteredClasses(finalResults);
      } catch (error) {
        console.error('Error searching classes:', error);
        setFilteredClasses(classes); // Fallback to all classes
      } finally {
        setIsSearchingClasses(false);
      }
    }, 300);
  }, [classes]);

  // Handle subject search with debounce
  const handleSubjectSearch = useCallback((query: string) => {
    setSubjectSearchQuery(query);
    
    // Clear existing timer
    if (subjectSearchTimer.current) {
      clearTimeout(subjectSearchTimer.current);
    }
    
    // If less than 3 characters, show all subjects (local filter)
    if (query.length < 3) {
      let filtered = subjects.filter((s) => {
        const name = (s?.name || '').toLowerCase();
        const label = (s?.label || '').toLowerCase();
        const value = (s?.value || '').toLowerCase();
        const q = query.toLowerCase();
        return name.includes(q) || label.includes(q) || value.includes(q);
      });
      
      // Always include the currently selected subject, even if it doesn't match the search
      if (subjectValue) {
        const selectedSubject = subjects.find(s => s.id === subjectValue);
        if (selectedSubject && !filtered.find(s => s.id === subjectValue)) {
          filtered = [selectedSubject, ...filtered];
        }
      }
      
      setFilteredSubjects(filtered);
      setIsSearchingSubjects(false);
      return;
    }
    
    // Set searching state
    setIsSearchingSubjects(true);
    
    // Debounce API search - wait 300ms after user stops typing
    subjectSearchTimer.current = setTimeout(async () => {
      try {
        const q = query.toLowerCase();
        const results = (await searchDropdown('subjects', query, 10)).filter(
          (item: any) => item?.id && (item?.name || item?.label || item?.value)
        ).filter((item: any) => {
          const name = (item?.name || '').toLowerCase();
          const label = (item?.label || '').toLowerCase();
          const value = (item?.value || '').toLowerCase();
          return name.includes(q) || label.includes(q) || value.includes(q);
        });
        
        // Always include the currently selected subject, even if it's not in search results
        let finalResults = [...results];
        if (subjectValue) {
          const selectedSubject = subjects.find(s => s.id === subjectValue);
          if (selectedSubject && !finalResults.find(s => s.id === subjectValue)) {
            finalResults = [selectedSubject, ...finalResults];
          }
        }
        
        setFilteredSubjects(finalResults);
      } catch (error) {
        console.error('Error searching subjects:', error);
        setFilteredSubjects(subjects); // Fallback to all subjects
      } finally {
        setIsSearchingSubjects(false);
      }
    }, 300);
  }, [subjects]);

  // Search functionality for classes and subjects (API-based for longer queries)
  const handleSearch = useCallback(async (type: 'classes' | 'subjects', query: string) => {
    try {
      if (query.length < 3) return;

      const results = await searchDropdown(type, query, 10);
      if (type === 'classes') {
        setFilteredClasses(results);
      } else if (type === 'subjects') {
        setFilteredSubjects(results);
      }
    } catch (error) {
      console.error(`Error searching ${type}:`, error);
    }
  }, []);

  // Handle class selection from modal
  const handleClassSelect = useCallback((item: ClassItem) => {
    if (onClassChange) {
      onClassChange(item.id);
    }
    setShowClassModal(false);
  }, [onClassChange]);

  // Handle subject selection from modal
  const handleSubjectSelect = useCallback((item: SubjectItem) => {
    if (onSubjectChange) {
      onSubjectChange(item.id);
    }
    setShowSubjectModal(false);
  }, [onSubjectChange]);

  // Get selected class name
  const getSelectedClassName = () => {
    // First check in filteredClasses (includes search results)
    let selected = filteredClasses.find(c => c.id === classValue);
    // Fallback to classes prop if not found
    if (!selected) {
      selected = classes.find(c => c.id === classValue);
    }
    return selected?.name || 'Select a class...';
  };

  // Get selected subject name
  const getSelectedSubjectName = () => {
    // First check in filteredSubjects (includes search results)
    let selected = filteredSubjects.find(s => s.id === subjectValue);
    // Fallback to subjects prop if not found
    if (!selected) {
      selected = subjects.find(s => s.id === subjectValue);
    }
    return selected?.name || 'Select a subject...';
  };

  // Get selected difficulty name
  const getSelectedDifficultyName = () => {
    const selected = difficultyLevels.find(d => d.id === difficultyValue);
    return selected?.name;
  };

  // Get selected question count display
  const getSelectedQuestionCount = () => {
    return questionCountValue ? `${questionCountValue} Questions` : 'Select number...';
  };

  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <View>
      {/* Class/Grade Field */}
      {showClass && (
        <View style={[styles.field, compact && styles.fieldCompact]}>
          <Text style={styles.label}>Class/Grade *</Text>
          {isLoadingClasses ? (
            <View style={styles.loadingContainer}>
              <LoadingSpinner size={20} />
              <Text style={styles.loadingText}>Loading classes...</Text>
            </View>
          ) : (
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={[styles.dropdownButton, compact && styles.dropdownButtonCompact]}
                onPress={() => setShowClassModal(true)}
              >
                <Text style={[
                  styles.dropdownButtonText,
                  compact && styles.dropdownButtonTextCompact,
                  !classValue && styles.placeholderText
                ]}>
                  {classValue ? getSelectedClassName() : 'Select a class...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {classValue && (
                <TouchableOpacity
                  style={[styles.clearButton, compact && styles.clearButtonCompact]}
                  onPress={() => onClassChange && onClassChange('')}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          )}
          {classError ? <Text style={styles.errorText}>{classError}</Text> : null}
        </View>
      )}

      {/* Class Dropdown Modal */}
      {showClass && (
        <Modal
          visible={showClassModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowClassModal(false)}
          statusBarTranslucent={true}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowClassModal(false)}
          >
            <TouchableOpacity 
              style={styles.modalContent} 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Class/Grade</Text>
                <TouchableOpacity onPress={() => setShowClassModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.searchInput}
                placeholder="Search classes..."
                value={classSearchQuery}
                onChangeText={handleClassSearch}
                placeholderTextColor={colors.placeholder}
              />

              {isSearchingClasses && (
                <View style={styles.searchLoader}>
                  <LoadingSpinner size={20} />
                </View>
              )}

              <ScrollView style={styles.optionsList}>
                {filteredClasses.filter(Boolean).map((cls) => (
                  <TouchableOpacity
                    key={cls.id}
                    style={[
                      styles.optionItem,
                      classValue === cls.id && styles.optionItemSelected,
                    ]}
                    onPress={() => handleClassSelect(cls)}
                  >
                    <Text style={[
                      styles.optionText,
                      classValue === cls.id && styles.optionTextSelected,
                    ]}>
                      {cls.name || cls.label || cls.value || 'Unnamed class'}
                    </Text>
                    {classValue === cls.id && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
                {filteredClasses.length === 0 && (
                  <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>No classes found</Text>
                  </View>
                )}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Subject Field */}
      {showSubject && (
        <View style={[styles.field, compact && styles.fieldCompact]}>
          <Text style={styles.label}>Subject *</Text>
          {isLoadingSubjects ? (
            <View style={styles.loadingContainer}>
              <LoadingSpinner size={20} />
              <Text style={styles.loadingText}>Loading subjects...</Text>
            </View>
          ) : (
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={[styles.dropdownButton, compact && styles.dropdownButtonCompact]}
                onPress={() => setShowSubjectModal(true)}
              >
                <Text style={[
                  styles.dropdownButtonText,
                  compact && styles.dropdownButtonTextCompact,
                  !subjectValue && styles.placeholderText
                ]}>
                  {subjectValue ? getSelectedSubjectName() : 'Select a subject...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {subjectValue && (
                <TouchableOpacity
                  style={[styles.clearButton, compact && styles.clearButtonCompact]}
                  onPress={() => onSubjectChange && onSubjectChange('')}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          )}
          {subjectError ? <Text style={styles.errorText}>{subjectError}</Text> : null}
        </View>
      )}

      {/* Subject Dropdown Modal */}
      {showSubject && (
        <Modal
          visible={showSubjectModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSubjectModal(false)}
          statusBarTranslucent={true}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowSubjectModal(false)}
          >
            <TouchableOpacity 
              style={styles.modalContent} 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Subject</Text>
                <TouchableOpacity onPress={() => setShowSubjectModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.searchInput}
                placeholder="Search subjects..."
                value={subjectSearchQuery}
                onChangeText={handleSubjectSearch}
                placeholderTextColor={colors.placeholder}
              />

              {isSearchingSubjects && (
                <View style={styles.searchLoader}>
                  <LoadingSpinner size={20} />
                </View>
              )}

              <ScrollView style={styles.optionsList}>
                {filteredSubjects.filter(Boolean).map((subj) => (
                  <TouchableOpacity
                    key={subj.id}
                    style={[
                      styles.optionItem,
                      subjectValue === subj.id && styles.optionItemSelected,
                    ]}
                    onPress={() => handleSubjectSelect(subj)}
                  >
                    <Text style={[
                      styles.optionText,
                      subjectValue === subj.id && styles.optionTextSelected,
                    ]}>
                      {subj.name || subj.label || subj.value || 'Unnamed subject'}
                    </Text>
                    {subjectValue === subj.id && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
                {filteredSubjects.length === 0 && (
                  <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>No subjects found</Text>
                  </View>
                )}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Student Level Field (alternative to class/subject) */}
      {showStudentLevel && (
        <View style={[styles.field, compact && styles.fieldCompact]}>
          <Text style={styles.label}>Student Level *</Text>
          {isLoadingStudentLevels ? (
            <View style={styles.loadingContainer}>
              <LoadingSpinner size={20} />
              <Text style={styles.loadingText}>Loading levels...</Text>
            </View>
          ) : (
            <View style={[styles.pickerContainer, compact && styles.pickerContainerCompact]}>
              <Picker
                selectedValue={studentLevelValue}
                onValueChange={onStudentLevelChange}
                style={[styles.picker, compact && styles.pickerCompact]}
                dropdownIconColor={colors.primary}
                mode="dropdown"
              >
                <Picker.Item label="Select student level..." value="" />
                {studentLevels.map((level) => (
                  <Picker.Item
                    key={level.id}
                    label={level.label || level.name}
                    value={level.id}
                  />
                ))}
              </Picker>
            </View>
          )}
        </View>
      )}

      {/* Lesson/Topic Field */}
      {showLesson && (
        <View style={[styles.field, compact && styles.fieldCompact]}>
          <Text style={styles.label}>{lessonLabel} *</Text>
          <TextInput
            style={[styles.input, compact && styles.inputCompact]}
            value={lessonValue}
            onChangeText={onLessonChange}
            onBlur={onLessonBlur}
            placeholder={lessonPlaceholder}
            placeholderTextColor={colors.placeholder}
          />
          {lessonError ? <Text style={styles.errorText}>{lessonError}</Text> : null}
        </View>
      )}

      {/* Difficulty Level Field */}
      {showDifficultyLevel && (
        <View style={[styles.field, compact && styles.fieldCompact]}>
          <Text style={styles.label}>Difficulty Level *</Text>
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={[styles.dropdownButton, compact && styles.dropdownButtonCompact]}
              onPress={() => setShowDifficultyModal(true)}
            >
              <Text style={[
                styles.dropdownButtonText,
                compact && styles.dropdownButtonTextCompact,
                !difficultyValue && styles.placeholderText
              ]}>
                {difficultyValue ? getSelectedDifficultyName() : 'Select a difficulty...'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {difficultyError ? <Text style={styles.errorText}>{difficultyError}</Text> : null}
        </View>
      )}

      {/* Difficulty Level Dropdown Modal */}
      {showDifficultyLevel && (
        <Modal
          visible={showDifficultyModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDifficultyModal(false)}
          statusBarTranslucent={true}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowDifficultyModal(false)}
          >
            <TouchableOpacity 
              style={styles.modalContent} 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Difficulty Level</Text>
                <TouchableOpacity onPress={() => setShowDifficultyModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.optionsList}>
                {difficultyLevels.map((level) => (
                  <TouchableOpacity
                    key={level.id}
                    style={[
                      styles.optionItem,
                      difficultyValue === level.id && styles.optionItemSelected,
                    ]}
                    onPress={() => {
                      onDifficultyChange && onDifficultyChange(level.id);
                      setShowDifficultyModal(false);
                    }}
                  >
                    <Text style={[
                      styles.optionText,
                      difficultyValue === level.id && styles.optionTextSelected,
                    ]}>
                      {level.name}
                    </Text>
                    {difficultyValue === level.id && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Number of Questions Field */}
      {showQuestionCount && (
        <View style={[styles.field, compact && styles.fieldCompact]}>
          <Text style={styles.label}>Number of Questions *</Text>
          {usePickerForCount ? (
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={[styles.dropdownButton, compact && styles.dropdownButtonCompact]}
                onPress={() => setShowQuestionCountModal(true)}
              >
                <Text style={[
                  styles.dropdownButtonText,
                  compact && styles.dropdownButtonTextCompact,
                  !questionCountValue && styles.placeholderText
                ]}>
                  {questionCountValue ? getSelectedQuestionCount() : 'Select number...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {questionCountValue && (
                <TouchableOpacity
                  style={[styles.clearButton, compact && styles.clearButtonCompact]}
                  onPress={() => onQuestionCountChange && onQuestionCountChange('')}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TextInput
              style={[styles.input, compact && styles.inputCompact]}
              value={questionCountValue}
              onChangeText={onQuestionCountChange}
              placeholder="5"
              placeholderTextColor={colors.placeholder}
              keyboardType="number-pad"
            />
          )}
          {questionCountError ? <Text style={styles.errorText}>{questionCountError}</Text> : null}
        </View>
      )}

      {/* Number of Questions Dropdown Modal */}
      {showQuestionCount && usePickerForCount && (
        <Modal
          visible={showQuestionCountModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowQuestionCountModal(false)}          statusBarTranslucent={true}        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowQuestionCountModal(false)}
          >
            <TouchableOpacity 
              style={styles.modalContent} 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Number of Questions</Text>
                <TouchableOpacity onPress={() => setShowQuestionCountModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.optionsList}>
                {questionCountOptions.map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.optionItem,
                      questionCountValue === num && styles.optionItemSelected,
                    ]}
                    onPress={() => {
                      onQuestionCountChange && onQuestionCountChange(num);
                      setShowQuestionCountModal(false);
                    }}
                  >
                    <Text style={[
                      styles.optionText,
                      questionCountValue === num && styles.optionTextSelected,
                    ]}>
                      {num} Questions
                    </Text>
                    {questionCountValue === num && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Additional Instructions Field */}
      {showAdditionalInstructions && (
        <View style={[styles.field, compact && styles.fieldCompact]}>
          <Text style={styles.label}>Additional Instructions *</Text>
          <TextInput
            style={[styles.textArea, compact && styles.textAreaCompact]}
            value={additionalInstructionsValue}
            onChangeText={onAdditionalInstructionsChange}
            onBlur={onAdditionalInstructionsBlur}
            placeholder="Enter any additional instructions here..."
            placeholderTextColor={colors.placeholder}
            multiline={true}
            numberOfLines={compact ? 3 : 4}
          />
          {additionalInstructionsError ? (
            <Text style={styles.errorText}>{additionalInstructionsError}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  field: {
    marginBottom: 24,
  },
  fieldCompact: {
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  input: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
    color: colors.text,
  },
  inputCompact: {
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
  },
  pickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pickerContainerCompact: {
    borderRadius: 8,
  },
  picker: {
    height: 52,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  pickerCompact: {
    height: 44,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingText: {
    marginLeft: 10,
    color: colors.textSecondary,
    fontSize: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '500',
  },
  dropdownContainer: {
    position: 'relative',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropdownButtonCompact: {
    padding: 10,
    borderRadius: 8,
  },
  dropdownButtonText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  dropdownButtonTextCompact: {
    fontSize: 14,
  },
  placeholderText: {
    color: colors.placeholder,
  },
  clearButton: {
    position: 'absolute',
    right: 40,
    top: 13,
    padding: 4,
    zIndex: 10,
  },
  clearButtonCompact: {
    top: 9,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modalContent: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  searchInput: {
    backgroundColor: colors.surface,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
    color: colors.text,
  },
  searchLoader: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  optionsList: {
    maxHeight: 400,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionItemSelected: {
    backgroundColor: colors.surface,
  },
  optionText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: colors.placeholder,
  },
  textArea: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
    color: colors.text,
    minHeight: 110,
    maxHeight: 160,
    textAlignVertical: 'top',
  },
  textAreaCompact: {
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
    minHeight: 80,
    maxHeight: 120,
  },
});
