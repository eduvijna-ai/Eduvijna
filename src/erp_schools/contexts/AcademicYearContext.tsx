/**
 * Academic year selector for erp_schools (mirrors legacy erp AcademicYearContext
 * but lives inside erp_schools — no import from src/erp/).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { erpAcademicYearsApi } from '@core/api/erp.api';
import { safeList } from '../utils/apiHelpers';

export interface AcademicYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  school_id?: number;
}

interface AcademicYearContextValue {
  academicYears: AcademicYear[];
  selectedYearId: number | null;
  selectedYear: AcademicYear | null;
  setSelectedYearId: (id: number | null) => void;
  loading: boolean;
  refresh: () => void;
}

const AcademicYearContext = createContext<AcademicYearContextValue>({
  academicYears: [],
  selectedYearId: null,
  selectedYear: null,
  setSelectedYearId: () => {},
  loading: false,
  refresh: () => {},
});

export const AcademicYearProvider: React.FC<{
  children: React.ReactNode;
  schoolId?: number | null;
}> = ({ children, schoolId }) => {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, number> = { per_page: 50 };
      if (schoolId) params.school_id = schoolId;
      const data = await erpAcademicYearsApi.list(params);
      const rawItems = safeList<Record<string, unknown>>(data);
      const years: AcademicYear[] = rawItems.map((y) => ({
        id: Number(y.academic_year_id ?? y.id),
        name: String(y.name ?? y.year_name ?? y.academic_year_id ?? y.id ?? ''),
        start_date: String(y.start_date ?? ''),
        end_date: String(y.end_date ?? ''),
        is_current: Boolean(y.is_current),
        school_id: y.school_id != null ? Number(y.school_id) : undefined,
      }));
      setAcademicYears(years);
      const payload = data as { current_year_id?: number } | null;
      const currentId = payload?.current_year_id;
      setSelectedYearId((prev) => {
        if (prev != null && years.some((y) => y.id === prev)) return prev;
        const current = currentId
          ? years.find((y) => y.id === currentId)
          : years.find((y) => y.is_current);
        if (current) return current.id;
        return years[0]?.id ?? null;
      });
    } catch {
      setAcademicYears([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedYear = useMemo(
    () => academicYears.find((y) => y.id === selectedYearId) ?? null,
    [academicYears, selectedYearId],
  );

  const value = useMemo(
    () => ({
      academicYears,
      selectedYearId,
      selectedYear,
      setSelectedYearId,
      loading,
      refresh: load,
    }),
    [academicYears, selectedYearId, selectedYear, loading, load],
  );

  return (
    <AcademicYearContext.Provider value={value}>{children}</AcademicYearContext.Provider>
  );
};

export const useAcademicYear = () => useContext(AcademicYearContext);
