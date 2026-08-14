import { useEffect, useMemo, useState } from 'react';
import { getBookFilters } from '@core/services/documentUploadApi';
import type { ClassItem, SubjectItem } from '@core/services/dropdown';

export function matchDropdownItem<T extends { id: string; name?: string; label?: string; value?: string }>(
  items: T[],
  value?: string,
): T | undefined {
  const raw = String(value || '').trim();
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  return items.find(
    (item) =>
      item.id === raw ||
      String(item.name || '').toLowerCase() === lower ||
      String(item.label || '').toLowerCase() === lower ||
      String(item.value || '').toLowerCase() === lower,
  );
}

export function dropdownItemLabel(item?: { name?: string; label?: string; value?: string } | null): string {
  return String(item?.name || item?.label || item?.value || '').trim();
}

function toDropdownItems(values: string[]): ClassItem[] {
  return (values || [])
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .map((value) => ({ id: value, name: value, label: value, value }));
}

/**
 * Document-quiz class/subject lists — same source as web HandwrittenWorkspace:
 * GET /api/v1/study-materials/filters → grade_levels / subjects.
 * That is why web Demo School only shows "10" and "Class 10", not Class 4–10.
 */
export function useSchoolClassSubjectDropdowns(_selectedClassId: string) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoadingClasses(true);
    setIsLoadingSubjects(true);
    setClassesError(null);

    getBookFilters()
      .then((filters) => {
        if (!active) return;
        setClasses(toDropdownItems(filters.grade_levels));
        setSubjects(toDropdownItems(filters.subjects));
      })
      .catch(() => {
        if (!active) return;
        setClasses([]);
        setSubjects([]);
        setClassesError('Failed to load classes');
      })
      .finally(() => {
        if (!active) return;
        setIsLoadingClasses(false);
        setIsLoadingSubjects(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedClass = useMemo(
    () => matchDropdownItem(classes, _selectedClassId),
    [classes, _selectedClassId],
  );

  return {
    classes,
    subjects,
    isLoadingClasses,
    isLoadingSubjects,
    classesError,
    classLabel: dropdownItemLabel(selectedClass),
    subjectLabel: (subjectId: string) => dropdownItemLabel(matchDropdownItem(subjects, subjectId)),
  };
}

export type { ClassItem, SubjectItem };
