import React, { createContext, useContext, useEffect, useState } from 'react';
import { erpAcademicYearsApi } from '../../core/api/erp.api';

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

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { per_page: 50 };
      if (schoolId) params.school_id = schoolId;
      const data = await erpAcademicYearsApi.list(params);
      const rawItems: any[] = data?.items ?? data ?? [];
      // Normalise: API returns academic_year_id — map to id for this context
      const years: AcademicYear[] = rawItems.map((y: any) => ({
        id: y.academic_year_id ?? y.id,
        name: y.name ?? y.year_name ?? String(y.academic_year_id ?? y.id),
        start_date: y.start_date ?? '',
        end_date: y.end_date ?? '',
        is_current: !!(y.is_current),
        school_id: y.school_id,
      }));
      setAcademicYears(years);
      // Auto-select current year; also honour possible current_year_id from API
      const currentId = data?.current_year_id;
      if (!selectedYearId) {
        const current = currentId
          ? years.find((y) => y.id === currentId)
          : years.find((y) => y.is_current);
        if (current) setSelectedYearId(current.id);
        else if (years.length > 0) setSelectedYearId(years[0].id);
      }
    } catch {
      // silent — no years available yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const selectedYear = academicYears.find((y) => y.id === selectedYearId) ?? null;

  return (
    <AcademicYearContext.Provider
      value={{
        academicYears,
        selectedYearId,
        selectedYear,
        setSelectedYearId,
        loading,
        refresh: load,
      }}
    >
      {children}
    </AcademicYearContext.Provider>
  );
};

export const useAcademicYear = () => useContext(AcademicYearContext);
