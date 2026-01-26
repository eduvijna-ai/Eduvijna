import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getClasses, getSubjects, getDifficultyLevels, type DropdownResponse } from '../core/services/dropdown';

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

export interface DifficultyLevel {
  id: string;
  name: string;
  slug?: string;
}

interface DropdownContextType {
  // Classes
  classes: ClassItem[];
  isLoadingClasses: boolean;
  classesError: string | null;
  refreshClasses: () => Promise<void>;
  
  // Subjects
  subjects: SubjectItem[];
  isLoadingSubjects: boolean;
  subjectsError: string | null;
  refreshSubjects: () => Promise<void>;
  
  // Difficulty Levels
  difficultyLevels: DifficultyLevel[];
  isLoadingDifficulty: boolean;
  difficultyError: string | null;
  refreshDifficulty: () => Promise<void>;
  
  // Refresh all
  refreshAll: () => Promise<void>;
}

const DropdownContext = createContext<DropdownContextType | undefined>(undefined);

export function useDropdowns() {
  const context = useContext(DropdownContext);
  if (context === undefined) {
    throw new Error('useDropdowns must be used within a DropdownProvider');
  }
  return context;
}

interface DropdownProviderProps {
  children: ReactNode;
}

export function DropdownProvider({ children }: DropdownProviderProps) {
  // Classes state
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [classesError, setClassesError] = useState<string | null>(null);
  
  // Subjects state
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  
  // Difficulty levels state
  const [difficultyLevels, setDifficultyLevels] = useState<DifficultyLevel[]>([]);
  const [isLoadingDifficulty, setIsLoadingDifficulty] = useState(false);
  const [difficultyError, setDifficultyError] = useState<string | null>(null);

  // Load classes
  const loadClasses = async () => {
    console.log('🔄 [DropdownContext] Loading classes...');
    setIsLoadingClasses(true);
    setClassesError(null);
    
    try {
      const response: DropdownResponse<ClassItem> = await getClasses();
      setClasses(response.items);
      console.log(`✅ [DropdownContext] Loaded ${response.items.length} classes`);
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Failed to load classes';
      setClassesError(errorMessage);
      console.error('❌ [DropdownContext] Failed to load classes:', errorMessage);
    } finally {
      setIsLoadingClasses(false);
    }
  };

  // Load subjects
  const loadSubjects = async () => {
    console.log('🔄 [DropdownContext] Loading subjects...');
    setIsLoadingSubjects(true);
    setSubjectsError(null);
    
    try {
      const response: DropdownResponse<SubjectItem> = await getSubjects();
      setSubjects(response.items);
      console.log(`✅ [DropdownContext] Loaded ${response.items.length} subjects`);
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Failed to load subjects';
      setSubjectsError(errorMessage);
      console.error('❌ [DropdownContext] Failed to load subjects:', errorMessage);
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  // Load difficulty levels
  const loadDifficulty = async () => {
    console.log('🔄 [DropdownContext] Loading difficulty levels...');
    setIsLoadingDifficulty(true);
    setDifficultyError(null);
    
    try {
      const response: DropdownResponse<DifficultyLevel> = await getDifficultyLevels();
      setDifficultyLevels(response.items);
      console.log(`✅ [DropdownContext] Loaded ${response.items.length} difficulty levels`);
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Failed to load difficulty levels';
      setDifficultyError(errorMessage);
      console.error('❌ [DropdownContext] Failed to load difficulty levels:', errorMessage);
    } finally {
      setIsLoadingDifficulty(false);
    }
  };

  // Auto-load dropdown data on mount
  useEffect(() => {
    console.log('🚀 [DropdownContext] Provider mounted - loading all dropdown data');
    loadClasses();
    loadSubjects();
    loadDifficulty();
  }, []);

  // Refresh functions
  const refreshClasses = async () => {
    await loadClasses();
  };

  const refreshSubjects = async () => {
    await loadSubjects();
  };

  const refreshDifficulty = async () => {
    await loadDifficulty();
  };

  const refreshAll = async () => {
    console.log('🔄 [DropdownContext] Refreshing all dropdown data...');
    await Promise.all([
      loadClasses(),
      loadSubjects(),
      loadDifficulty(),
    ]);
    console.log('✅ [DropdownContext] All dropdown data refreshed');
  };

  const value: DropdownContextType = {
    classes,
    isLoadingClasses,
    classesError,
    refreshClasses,
    
    subjects,
    isLoadingSubjects,
    subjectsError,
    refreshSubjects,
    
    difficultyLevels,
    isLoadingDifficulty,
    difficultyError,
    refreshDifficulty,
    
    refreshAll,
  };

  return (
    <DropdownContext.Provider value={value}>
      {children}
    </DropdownContext.Provider>
  );
}
