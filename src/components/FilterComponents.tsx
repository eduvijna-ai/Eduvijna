import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';
import { DateFilterType, getDateFilterOptions, getDateRange } from '../utils/dateFilters';
import DateTimePicker from '@react-native-community/datetimepicker';

// Classroom Filter Dropdown
interface ClassroomFilterProps {
  classrooms: Array<{ classroom_id: string; classroom_name: string }>;
  selectedClassroom: string;
  onSelect: (classroomId: string) => void;
  style?: any;
}

export const ClassroomFilter: React.FC<ClassroomFilterProps> = ({
  classrooms,
  selectedClassroom,
  onSelect,
  style,
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useFilterStyles();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClassrooms = classrooms.filter(c =>
    c.classroom_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.filterItem, style]}>
      <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Classroom</Text>
      <TouchableOpacity
        style={[styles.dropdownButton, { borderColor: colors.border, backgroundColor: colors.card }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.dropdownButtonText, { color: colors.text }]} numberOfLines={1}>
          {selectedClassroom === 'all'
            ? 'All Classrooms'
            : classrooms.find(c => c.classroom_id === selectedClassroom)?.classroom_name || 'Select'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Classroom</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.searchInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
              placeholder="Search classrooms..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.textSecondary}
            />

            <ScrollView style={styles.optionsList}>
              <TouchableOpacity
                style={[
                  styles.optionItem,
                  { borderBottomColor: colors.border },
                  selectedClassroom === 'all' && { backgroundColor: colors.primary + '10' },
                ]}
                onPress={() => {
                  onSelect('all');
                  setModalVisible(false);
                  setSearchQuery('');
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.text },
                    selectedClassroom === 'all' && { color: colors.primary, fontWeight: '600' },
                  ]}
                >
                  All Classrooms
                </Text>
                {selectedClassroom === 'all' && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>

              {filteredClassrooms.map(classroom => (
                <TouchableOpacity
                  key={classroom.classroom_id}
                  style={[
                    styles.optionItem,
                    { borderBottomColor: colors.border },
                    selectedClassroom === classroom.classroom_id && { backgroundColor: colors.primary + '10' },
                  ]}
                  onPress={() => {
                    onSelect(classroom.classroom_id);
                    setModalVisible(false);
                    setSearchQuery('');
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: colors.text },
                      selectedClassroom === classroom.classroom_id && { color: colors.primary, fontWeight: '600' },
                    ]}
                  >
                    {classroom.classroom_name}
                  </Text>
                  {selectedClassroom === classroom.classroom_id && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// Date Range Filter Component
interface DateRangeFilterProps {
  selectedDateFilter: DateFilterType;
  onDateFilterChange: (filter: DateFilterType, startDate: Date, endDate: Date) => void;
  style?: any;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  selectedDateFilter,
  onDateFilterChange,
  style,
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useFilterStyles();
  const [modalVisible, setModalVisible] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [pickingStartDate, setPickingStartDate] = useState(true);

  // Get the label for selected filter
  const getSelectedLabel = () => {
    const option = getDateFilterOptions().find(opt => opt.value === selectedDateFilter);
    if (selectedDateFilter === 'custom' && customStartDate && customEndDate) {
      return `${customStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${customEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    return option?.label || 'Select Date Range';
  };

  // Calculate and notify parent when filter changes
  React.useEffect(() => {
    if (selectedDateFilter !== 'custom') {
      const { startDate, endDate } = getDateRange(selectedDateFilter);
      onDateFilterChange(selectedDateFilter, startDate, endDate);
    }
  }, [selectedDateFilter]);

  const handleDateOptionPress = (filterType: DateFilterType) => {
    if (filterType === 'custom') {
      setShowCustomDatePicker(true);
      setPickingStartDate(true);
    } else {
      const { startDate, endDate } = getDateRange(filterType);
      onDateFilterChange(filterType, startDate, endDate);
      setModalVisible(false);
    }
  };

  const handleCustomDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowCustomDatePicker(false);
    }
    
    if (selectedDate) {
      if (pickingStartDate) {
        setCustomStartDate(selectedDate);
        setPickingStartDate(false);
        if (Platform.OS === 'ios') {
          // On iOS, immediately show end date picker
          setTimeout(() => setShowCustomDatePicker(true), 100);
        } else {
          // On Android, show end date picker
          setShowCustomDatePicker(true);
        }
      } else {
        setCustomEndDate(selectedDate);
        onDateFilterChange('custom', customStartDate, selectedDate);
        setShowCustomDatePicker(false);
        setModalVisible(false);
      }
    }
  };

  return (
    <View style={[styles.filterItem, style]}>
      <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Date Range</Text>
      <TouchableOpacity
        style={[styles.dropdownButton, { borderColor: colors.border, backgroundColor: colors.card }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.dropdownButtonText, { color: colors.text }]} numberOfLines={1}>
          {getSelectedLabel()}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Date Range Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Date Range</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.optionsList}>
              {getDateFilterOptions().map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionItem,
                    { borderBottomColor: colors.border },
                    selectedDateFilter === option.value && { backgroundColor: colors.primary + '10' },
                  ]}
                  onPress={() => handleDateOptionPress(option.value as DateFilterType)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: colors.text },
                      selectedDateFilter === option.value && { color: colors.primary, fontWeight: '600' },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selectedDateFilter === option.value && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Custom Date Picker */}
      {showCustomDatePicker && (
        <Modal
          visible={showCustomDatePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCustomDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card, padding: 20 }]}>
              <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 16 }]}>
                {pickingStartDate ? 'Select Start Date' : 'Select End Date'}
              </Text>
              <DateTimePicker
                value={pickingStartDate ? customStartDate : customEndDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleCustomDateChange}
                maximumDate={new Date()}
              />
              {Platform.OS === 'ios' && (
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <TouchableOpacity
                    style={{ flex: 1, paddingVertical: 12, backgroundColor: colors.border, borderRadius: 8, alignItems: 'center' }}
                    onPress={() => {
                      setShowCustomDatePicker(false);
                      setPickingStartDate(true);
                    }}
                  >
                    <Text style={{ color: colors.text }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, paddingVertical: 12, backgroundColor: colors.primary, borderRadius: 8, alignItems: 'center' }}
                    onPress={() => {
                      if (pickingStartDate) {
                        setPickingStartDate(false);
                      } else {
                        handleCustomDateChange({}, pickingStartDate ? customStartDate : customEndDate);
                      }
                    }}
                  >
                    <Text style={{ color: '#fff' }}>{pickingStartDate ? 'Next' : 'Done'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

// Filter Section with collapse/expand
interface FilterSectionProps {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}

export const FilterSection: React.FC<FilterSectionProps> = ({
  children,
  defaultCollapsed = false,
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useFilterStyles();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <View style={[styles.filtersSection, { backgroundColor: colors.card }]}>
      <TouchableOpacity
        style={styles.filtersCollapseButton}
        onPress={() => setIsCollapsed(!isCollapsed)}
        activeOpacity={0.7}
      >
        <Ionicons name="filter" size={20} color={colors.textSecondary} />
        <Text style={[styles.filtersCollapseText, { color: colors.text }]}>Filters</Text>
        <Ionicons
          name={isCollapsed ? 'chevron-down' : 'chevron-up'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {!isCollapsed && <View style={styles.filtersContent}>{children}</View>}
    </View>
  );
};

// Helper to get dynamic styles
const useFilterStyles = () => {
  
  return StyleSheet.create({
    filterItem: {
      flex: 1,
    },
    filterLabel: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 6,
    },
    dropdownButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      height: 40,
    },
    dropdownButtonText: {
      fontSize: 13,
      flex: 1,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      borderRadius: 16,
      width: '100%',
      maxHeight: '70%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 14,
      borderBottomWidth: 1,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '600',
    },
    searchInput: {
      margin: 12,
      marginBottom: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderRadius: 8,
      fontSize: 14,
    },
    optionsList: {
      maxHeight: 300,
    },
    optionItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
    },
    optionText: {
      fontSize: 15,
      flex: 1,
    },
    filtersSection: {
      marginHorizontal: 12,
      marginBottom: 6,
      marginTop: 6,
      borderRadius: 10,
      padding: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    filtersCollapseButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 0,
    },
    filtersCollapseText: {
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 8,
      flex: 1,
    },
    filtersContent: {
      marginTop: 10,
    },
  });
};
