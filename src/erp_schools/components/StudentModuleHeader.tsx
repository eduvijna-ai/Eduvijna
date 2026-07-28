/**
 * StudentModuleHeader — StudentIdentityHeader pre-filled from live student
 * profile + academic-year pill. Use on every student module screen.
 */

import React, { useMemo } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { useStudentData } from '../hooks/useStudentData';
import { AcademicYearPill } from './AcademicYearPill';
import { StudentIdentityHeader } from './StudentIdentityHeader';

type IconName = keyof typeof Ionicons.glyphMap;

interface StudentModuleHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  trailingIcon?: IconName;
  onTrailingPress?: () => void;
  trailingAccessibilityLabel?: string;
  /** Hide academic-year pill (e.g. when the screen already has its own AY UI). */
  hideYearPill?: boolean;
  rightSlot?: React.ReactNode;
}

function shortYearLabel(name: string): string {
  return name.replace(/^Academic Year\s*/i, '').trim() || name;
}

export function StudentModuleHeader({
  title,
  showBack = true,
  onBack,
  trailingIcon,
  onTrailingPress,
  trailingAccessibilityLabel,
  hideYearPill = false,
  rightSlot,
}: StudentModuleHeaderProps) {
  const { profile, dashboard } = useStudentData();
  const { academicYears, selectedYear, selectedYearId, setSelectedYearId } =
    useAcademicYear();

  const classLabel =
    (dashboard.classLabel && dashboard.classLabel.trim()) ||
    profile.className ||
    '';

  const yearPill = useMemo(() => {
    if (hideYearPill || rightSlot) return null;
    if (!selectedYear || academicYears.length === 0) {
      if (profile.academicYear) {
        return (
          <AcademicYearPill
            value={shortYearLabel(profile.academicYear)}
            options={[shortYearLabel(profile.academicYear)]}
            onChange={() => undefined}
          />
        );
      }
      return null;
    }
    return (
      <AcademicYearPill
        value={shortYearLabel(selectedYear.name)}
        options={academicYears.map((y) => shortYearLabel(y.name))}
        onChange={(label) => {
          const match = academicYears.find(
            (y) => shortYearLabel(y.name) === label || y.name === label,
          );
          if (match && match.id !== selectedYearId) setSelectedYearId(match.id);
        }}
      />
    );
  }, [
    hideYearPill,
    rightSlot,
    selectedYear,
    academicYears,
    profile.academicYear,
    selectedYearId,
    setSelectedYearId,
  ]);

  return (
    <StudentIdentityHeader
      title={title}
      studentName={profile.name}
      className={classLabel}
      rollNo={profile.rollNo}
      admissionNo={profile.admissionNo}
      avatarUrl={profile.avatarUrl}
      showBack={showBack}
      onBack={onBack}
      trailingIcon={trailingIcon}
      onTrailingPress={onTrailingPress}
      trailingAccessibilityLabel={trailingAccessibilityLabel}
      rightSlot={rightSlot ?? yearPill}
    />
  );
}
