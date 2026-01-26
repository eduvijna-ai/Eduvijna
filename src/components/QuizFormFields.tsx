import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '@context/ThemeContext';
import { useDropdowns } from '../context/DropdownContext';

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
  difficultyLevels?: Array<{ id: string; name: string; label?: string; value?: string }>; // Now optional - will load from API if not provided
  
  // Number of Questions field
  showQuestionCount?: boolean;
  questionCountValue?: string;
  onQuestionCountChange?: (value: string) => void;
  questionCountOptions?: string[];
  usePickerForCount?: boolean;
  
  // Lesson/Topic field
  showLesson?: boolean;
  lessonValue?: string;
  onLessonChange?: (value: string) => void;
  lessonPlaceholder?: string;
  lessonLabel?: string;

  // Additional Instructions field
  showAdditionalInstructions?: boolean;
  additionalInstructionsValue?: string;
  onAdditionalInstructionsChange?: (value: string) => void;
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
    difficultyLevels: propDifficultyLevels,
    
    showQuestionCount = false,
    questionCountValue = '5',
    onQuestionCountChange,
    questionCountOptions = ['3', '5', '10', '15', '20', '25', '30'],
    usePickerForCount = true,
    
    showLesson = false,
    lessonValue = '',
    onLessonChange,
    lessonPlaceholder = 'Enter lesson or topic name',
    lessonLabel = 'Lesson/Topic',

    showAdditionalInstructions = true,
    additionalInstructionsValue = '',
    onAdditionalInstructionsChange,
  } = props;

  // Use prop data if provided, otherwise use context data (loaded once for entire app)
  const classes = propClasses || contextClasses;
  const subjects = propSubjects || contextSubjects;
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

  // Initialize filtered lists when data changes
  useEffect(() => {
    setFilteredClasses(classes);
  }, [classes]);

  useEffect(() => {
    setFilteredSubjects(subjects);
  }, [subjects]);

  // Handle class search (local filtering)
  const handleClassSearch = useCallback((query: string) => {
    setClassSearchQuery(query);
    
    if (query.length === 0) {
      setFilteredClasses(classes);
      return;
    }
    
    const filtered = classes.filter((c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.label?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredClasses(filtered);
  }, [classes]);

  // Handle subject search (local filtering)
  const handleSubjectSearch = useCallback((query: string) => {
    setSubjectSearchQuery(query);
    
    if (query.length === 0) {
      setFilteredSubjects(subjects);
      return;
    }
    
    const filtered = subjects.filter((s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.label?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredSubjects(filtered);
  }, [subjects]);

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
    const selected = classes.find(c => c.id === classValue);
    return selected?.name || 'Select a class...';
  };

  // Get selected subject name
  const getSelectedSubjectName = () => {
    const selected = subjects.find(s => s.id === subjectValue);
    return selected?.name || 'Select a subject...';
  };

  // Get selected difficulty name
  const getSelectedDifficultyName = () => {
    const selected = difficultyLevels.find(d => d.id === difficultyValue);
    return selected?.name || 'Select difficulty...';
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
        <View style={styles.field}>
          <Text style={styles.label}>Class/Grade *</Text>
          {classError ? <Text style={styles.errorText}>{classError}</Text> : null}
          {isLoadingClasses ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Loading classes...</Text>
            </View>
          ) : (
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowClassModal(true)}
              >
                <Text style={[
                  styles.dropdownButtonText,
                  !classValue && styles.placeholderText
                ]}>
                  {classValue ? getSelectedClassName() : 'Select a class...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {classValue && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => onClassChange && onClassChange('')}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          )}
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

              <ScrollView style={styles.optionsList}>
                {filteredClasses.map((cls) => (
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
                      {cls.name}
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
        <View style={styles.field}>
          <Text style={styles.label}>Subject *</Text>
          {subjectError ? <Text style={styles.errorText}>{subjectError}</Text> : null}
          {isLoadingSubjects ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Loading subjects...</Text>
            </View>
          ) : (
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowSubjectModal(true)}
              >
                <Text style={[
                  styles.dropdownButtonText,
                  !subjectValue && styles.placeholderText
                ]}>
                  {subjectValue ? getSelectedSubjectName() : 'Select a subject...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {subjectValue && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => onSubjectChange && onSubjectChange('')}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          )}
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

              <ScrollView style={styles.optionsList}>
                {filteredSubjects.map((subj) => (
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
                      {subj.name}
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
        <View style={styles.field}>
          <Text style={styles.label}>Student Level *</Text>
          {isLoadingStudentLevels ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Loading levels...</Text>
            </View>
          ) : (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={studentLevelValue}
                onValueChange={onStudentLevelChange}
                style={styles.picker}
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
        <View style={styles.field}>
          <Text style={styles.label}>{lessonLabel} *</Text>
          <TextInput
            style={styles.input}
            value={lessonValue}
            onChangeText={onLessonChange}
            placeholder={lessonPlaceholder}
            placeholderTextColor={colors.placeholder}
          />
        </View>
      )}

      {/* Difficulty Level Field */}
      {showDifficultyLevel && (
        <View style={styles.field}>
          <Text style={styles.label}>Difficulty Level</Text>
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowDifficultyModal(true)}
            >
              <Text style={[
                styles.dropdownButtonText,
                !difficultyValue && styles.placeholderText
              ]}>
                {difficultyValue ? getSelectedDifficultyName() : 'Select difficulty...'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            {difficultyValue && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => onDifficultyChange && onDifficultyChange('')}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
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
        <View style={styles.field}>
          <Text style={styles.label}>Number of Questions *</Text>
          {usePickerForCount ? (
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowQuestionCountModal(true)}
              >
                <Text style={[
                  styles.dropdownButtonText,
                  !questionCountValue && styles.placeholderText
                ]}>
                  {questionCountValue ? getSelectedQuestionCount() : 'Select number...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {questionCountValue && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => onQuestionCountChange && onQuestionCountChange('')}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TextInput
              style={styles.input}
              value={questionCountValue}
              onChangeText={onQuestionCountChange}
              placeholder="5"
              placeholderTextColor={colors.placeholder}
              keyboardType="number-pad"
            />
          )}
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
        <View style={styles.field}>
          <Text style={styles.label}>Additional Instructions</Text>
          <TextInput
            style={styles.textArea}
            value={additionalInstructionsValue}
            onChangeText={onAdditionalInstructionsChange}
            placeholder="Enter any additional instructions here..."
            placeholderTextColor={colors.placeholder}
            multiline={true}
            numberOfLines={4}
          />
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  field: {
    marginBottom: 24,
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
  pickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  picker: {
    height: 52,
    color: colors.text,
    backgroundColor: colors.surface,
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
  dropdownButtonText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
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
});
