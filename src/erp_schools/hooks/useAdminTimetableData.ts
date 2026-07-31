/**
 * useAdminTimetableData — web TimetableTab management seam (Templates / Weekly / Calendar).
 * APIs: timetableTemplatesApi, timetableSlotsApi, timetableLookupApi, timetableSubstituteApi
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  timetableLookupApi,
  timetableSlotsApi,
  timetableSubstituteApi,
  timetableTemplatesApi,
} from '@core/api/erp.api';
import { USE_MOCK_DATA } from '../config';
import {
  extractErrorMessage,
  pickNumber,
  pickString,
  safeList,
  toLocalDateStr,
  type LoadStatus,
} from '../utils/apiHelpers';
import {
  isDateInTemplateRange,
  jsSunColToBackendDow,
  type TtTabKey,
} from '../utils/timetableMeta';
import { useSchoolsSession } from './useSchoolsSession';

export type TtTemplate = {
  id: number;
  name: string;
  classId?: number;
  className: string;
  sectionId?: number;
  sectionName: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive: boolean;
};

export type TtSlot = {
  id: number;
  templateId: number;
  dayOfWeek: number;
  periodNumber: number;
  startTime: string;
  endTime: string;
  classId?: number;
  className: string;
  sectionId?: number;
  sectionName: string;
  subjectId?: number;
  subjectName: string;
  teacherId?: number;
  teacherName: string;
  room: string;
  slotType: string;
};

export type TtLookupOpt = { id: number; name: string };

function mapTemplate(r: Record<string, unknown>): TtTemplate {
  return {
    id: pickNumber(r.id),
    name: pickString(r.template_name, r.name, 'Template'),
    classId: pickNumber(r.class_id) || undefined,
    className: pickString(r.class_name, '—'),
    sectionId: pickNumber(r.section_id) || undefined,
    sectionName: pickString(r.section_name, '—'),
    effectiveFrom: pickString(r.effective_from).slice(0, 10) || undefined,
    effectiveTo: pickString(r.effective_to).slice(0, 10) || undefined,
    isActive: r.is_active !== false,
  };
}

function mapSlot(r: Record<string, unknown>): TtSlot {
  return {
    id: pickNumber(r.id),
    templateId: pickNumber(r.template_id),
    dayOfWeek: pickNumber(r.day_of_week),
    periodNumber: pickNumber(r.period_number, 1),
    startTime: pickString(r.start_time),
    endTime: pickString(r.end_time),
    classId: pickNumber(r.class_id) || undefined,
    className: pickString(r.class_name, '—'),
    sectionId: pickNumber(r.section_id) || undefined,
    sectionName: pickString(r.section_name, '—'),
    subjectId: pickNumber(r.subject_id) || undefined,
    subjectName: pickString(r.subject_name, r.slot_type, 'Period'),
    teacherId: pickNumber(r.teacher_id) || undefined,
    teacherName: pickString(r.teacher_name, '—'),
    room: pickString(r.room, '—'),
    slotType: pickString(r.slot_type, 'lecture'),
  };
}

function mapLookup(r: Record<string, unknown>, nameKeys: string[]): TtLookupOpt | null {
  const id = pickNumber(r.id, r.class_id, r.section_id, r.subject_id, r.teacher_id, r.user_id);
  if (!id) return null;
  const name =
    nameKeys.map((k) => pickString(r[k])).find(Boolean) ||
    pickString(r.name, r.label, `#${id}`);
  return { id, name };
}

export function useAdminTimetableData(tab: TtTabKey) {
  const session = useSchoolsSession();
  const schoolId = session.schoolId ?? undefined;

  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [templates, setTemplates] = useState<TtTemplate[]>([]);
  const [slots, setSlots] = useState<TtSlot[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>();

  // Browse filters (weekly / calendar)
  const [browseClassId, setBrowseClassId] = useState<number | undefined>();
  const [browseSectionId, setBrowseSectionId] = useState<number | undefined>();
  const [browseActive, setBrowseActive] = useState(false);

  const [activeDay, setActiveDay] = useState(() => {
    const js = new Date().getDay(); // Sun=0
    return js === 0 ? 6 : js - 1; // Mon=0
  });
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [slotTypeFilter, setSlotTypeFilter] = useState('all');

  const [classes, setClasses] = useState<TtLookupOpt[]>([]);
  const [sections, setSections] = useState<TtLookupOpt[]>([]);
  const [subjects, setSubjects] = useState<TtLookupOpt[]>([]);
  const [teachers, setTeachers] = useState<TtLookupOpt[]>([]);

  const templateById = useMemo(() => {
    const m = new Map<number, TtTemplate>();
    templates.forEach((t) => m.set(t.id, t));
    return m;
  }, [templates]);

  const selectedTemplate = selectedTemplateId
    ? templateById.get(selectedTemplateId)
    : undefined;

  const loadLookupsClasses = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await timetableLookupApi.classes(schoolId);
      setClasses(
        safeList<Record<string, unknown>>(raw)
          .map((r) => mapLookup(r, ['class_name', 'name', 'class_code']))
          .filter(Boolean) as TtLookupOpt[],
      );
    } catch {
      setClasses([]);
    }
  }, [schoolId]);

  const loadSections = useCallback(
    async (classId?: number) => {
      if (USE_MOCK_DATA || !schoolId || !classId) {
        setSections([]);
        return;
      }
      try {
        const raw = await timetableLookupApi.sections(classId, schoolId);
        setSections(
          safeList<Record<string, unknown>>(raw)
            .map((r) => mapLookup(r, ['section_name', 'name']))
            .filter(Boolean) as TtLookupOpt[],
        );
      } catch {
        setSections([]);
      }
    },
    [schoolId],
  );

  const loadSubjectsTeachers = useCallback(
    async (classId?: number, sectionId?: number) => {
      if (USE_MOCK_DATA || !schoolId || !classId) {
        setSubjects([]);
        setTeachers([]);
        return;
      }
      try {
        const [subRaw, teaRaw] = await Promise.all([
          timetableLookupApi.subjects(classId, schoolId),
          timetableLookupApi.teachers({
            class_id: classId,
            section_id: sectionId,
            school_id: schoolId,
          }),
        ]);
        setSubjects(
          safeList<Record<string, unknown>>(subRaw)
            .map((r) => mapLookup(r, ['subject_name', 'name']))
            .filter(Boolean) as TtLookupOpt[],
        );
        setTeachers(
          safeList<Record<string, unknown>>(teaRaw)
            .map((r) => mapLookup(r, ['teacher_name', 'name', 'full_name']))
            .filter(Boolean) as TtLookupOpt[],
        );
      } catch {
        setSubjects([]);
        setTeachers([]);
      }
    },
    [schoolId],
  );

  const loadTemplates = useCallback(async () => {
    if (USE_MOCK_DATA) {
      setStatus('ready');
      return;
    }
    if (!schoolId) {
      setStatus('ready');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const raw = await timetableTemplatesApi.list({
        school_id: schoolId,
        per_page: 200,
      });
      const list = safeList<Record<string, unknown>>(raw).map(mapTemplate);
      setTemplates(list);
      setSelectedTemplateId((prev) => {
        if (prev && list.some((t) => t.id === prev)) return prev;
        const firstActive = list.find((t) => t.isActive) || list[0];
        return firstActive?.id;
      });
      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load templates'));
      setStatus('error');
    }
  }, [schoolId]);

  const loadSlots = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) {
      setSlots([]);
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const params: Record<string, unknown> = {
        school_id: schoolId,
        is_active: true,
        per_page: 500,
      };
      if (browseActive && browseClassId && browseSectionId) {
        params.class_id = browseClassId;
        params.section_id = browseSectionId;
      } else if (selectedTemplateId) {
        params.template_id = selectedTemplateId;
      } else {
        setSlots([]);
        setStatus('ready');
        return;
      }
      const raw = await timetableSlotsApi.list(params);
      let list = safeList<Record<string, unknown>>(raw).map(mapSlot);
      if (browseActive && browseClassId && browseSectionId) {
        list = list.filter(
          (s) =>
            s.classId === browseClassId &&
            (!browseSectionId || s.sectionId === browseSectionId),
        );
      }
      setSlots(list);
      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load slots'));
      setStatus('error');
    }
  }, [
    schoolId,
    browseActive,
    browseClassId,
    browseSectionId,
    selectedTemplateId,
  ]);

  useEffect(() => {
    void loadLookupsClasses();
  }, [loadLookupsClasses]);

  useEffect(() => {
    if (tab === 'templates' || tab === 'grid' || tab === 'calendar') {
      void loadTemplates();
    }
  }, [tab, loadTemplates]);

  useEffect(() => {
    if (tab === 'grid' || tab === 'calendar') {
      void loadSlots();
    }
  }, [tab, loadSlots]);

  useEffect(() => {
    void loadSections(browseClassId);
  }, [browseClassId, loadSections]);

  const runBrowseSearch = useCallback(() => {
    if (!browseClassId || !browseSectionId) {
      setError('Select class and section');
      return;
    }
    setError(null);
    setBrowseActive(true);
    // Force reload even if already browsing
    setStatus('loading');
    void (async () => {
      try {
        const raw = await timetableSlotsApi.list({
          school_id: schoolId,
          class_id: browseClassId,
          section_id: browseSectionId,
          is_active: true,
          per_page: 500,
        });
        let list = safeList<Record<string, unknown>>(raw).map(mapSlot);
        list = list.filter(
          (s) =>
            s.classId === browseClassId &&
            (!browseSectionId || s.sectionId === browseSectionId),
        );
        setSlots(list);
        setStatus('ready');
      } catch (e) {
        setError(extractErrorMessage(e, 'Failed to load slots'));
        setStatus('error');
      }
    })();
  }, [browseClassId, browseSectionId, schoolId]);

  const clearBrowse = useCallback(() => {
    setBrowseActive(false);
    setBrowseClassId(undefined);
    setBrowseSectionId(undefined);
  }, []);

  const slotsForDay = useMemo(() => {
    return slots
      .filter((s) => s.dayOfWeek === activeDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.periodNumber - b.periodNumber);
  }, [slots, activeDay]);

  const dayCounts = useMemo(() => {
    const counts = Array.from({ length: 7 }, () => 0);
    slots.forEach((s) => {
      if (s.dayOfWeek >= 0 && s.dayOfWeek <= 6) counts[s.dayOfWeek] += 1;
    });
    return counts;
  }, [slots]);

  const filteredSlotsForCalendar = useMemo(() => {
    let list = slots;
    if (slotTypeFilter !== 'all') {
      list = list.filter((s) => s.slotType === slotTypeFilter);
    }
    return list;
  }, [slots, slotTypeFilter]);

  /** Map YYYY-MM-DD → slots projected for that calendar day (effective-range aware). */
  const calendarSlotsByDate = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const map: Record<string, TtSlot[]> = {};
    for (let day = 1; day <= daysInMonth; day += 1) {
      const d = new Date(year, month, day);
      const ymd = toLocalDateStr(d);
      const jsDow = d.getDay();
      const beDow = jsSunColToBackendDow(jsDow);
      const daySlots = filteredSlotsForCalendar.filter((s) => {
        if (s.dayOfWeek !== beDow) return false;
        const tmpl = templateById.get(s.templateId);
        return isDateInTemplateRange(ymd, tmpl);
      });
      if (daySlots.length) map[ymd] = daySlots;
    }
    return map;
  }, [monthCursor, filteredSlotsForCalendar, templateById]);

  const createTemplate = useCallback(
    async (payload: {
      template_name: string;
      class_id?: number;
      section_id?: number;
      effective_from?: string;
      effective_to?: string;
    }) => {
      if (!schoolId) return false;
      setSaving(true);
      setError(null);
      try {
        await timetableTemplatesApi.create({ ...payload, school_id: schoolId });
        await loadTemplates();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Create template failed'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId, loadTemplates],
  );

  const updateTemplate = useCallback(
    async (
      id: number,
      payload: {
        template_name?: string;
        class_id?: number | null;
        section_id?: number | null;
        effective_from?: string | null;
        effective_to?: string | null;
        is_active?: boolean;
      },
    ) => {
      setSaving(true);
      setError(null);
      try {
        await timetableTemplatesApi.update(id, payload, schoolId);
        await loadTemplates();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Update template failed'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId, loadTemplates],
  );

  const deactivateTemplate = useCallback(
    async (id: number) => {
      setSaving(true);
      setError(null);
      try {
        await timetableTemplatesApi.softDelete(id, schoolId);
        await loadTemplates();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate failed'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId, loadTemplates],
  );

  const createSlot = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!schoolId) return false;
      setSaving(true);
      setError(null);
      try {
        await timetableSlotsApi.create({ ...payload, school_id: schoolId });
        await loadSlots();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Create slot failed'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId, loadSlots],
  );

  const updateSlot = useCallback(
    async (id: number, payload: Record<string, unknown>) => {
      setSaving(true);
      setError(null);
      try {
        await timetableSlotsApi.update(id, payload, schoolId);
        await loadSlots();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Update slot failed'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId, loadSlots],
  );

  const deleteSlot = useCallback(
    async (id: number) => {
      setSaving(true);
      setError(null);
      try {
        await timetableSlotsApi.softDelete(id, schoolId);
        await loadSlots();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Delete slot failed'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId, loadSlots],
  );

  const createSubstitute = useCallback(
    async (payload: {
      slot_id: number;
      original_teacher_id?: number;
      substitute_teacher_id: number;
      substitute_date: string;
      reason?: string;
    }) => {
      if (!schoolId) return false;
      setSaving(true);
      setError(null);
      try {
        await timetableSubstituteApi.create(
          payload.slot_id,
          { ...payload, school_id: schoolId },
          schoolId,
        );
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Substitute failed'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId],
  );

  const getTemplate = useCallback(
    async (id: number) => {
      try {
        const raw = await timetableTemplatesApi.get(id, schoolId);
        const row = ((raw as { data?: unknown })?.data ?? raw) as Record<string, unknown>;
        return mapTemplate(row);
      } catch {
        return templates.find((t) => t.id === id) || null;
      }
    },
    [schoolId, templates],
  );

  const getSlot = useCallback(
    async (id: number) => {
      try {
        const raw = await timetableSlotsApi.get(id, schoolId);
        const row = ((raw as { data?: unknown })?.data ?? raw) as Record<string, unknown>;
        return mapSlot(row);
      } catch {
        return slots.find((s) => s.id === id) || null;
      }
    },
    [schoolId, slots],
  );

  return {
    status,
    error,
    saving,
    schoolId,
    templates,
    slots,
    selectedTemplateId,
    setSelectedTemplateId,
    selectedTemplate,
    browseClassId,
    setBrowseClassId,
    browseSectionId,
    setBrowseSectionId,
    browseActive,
    runBrowseSearch,
    clearBrowse,
    activeDay,
    setActiveDay,
    dayCounts,
    slotsForDay,
    monthCursor,
    setMonthCursor,
    slotTypeFilter,
    setSlotTypeFilter,
    calendarSlotsByDate,
    classes,
    sections,
    subjects,
    teachers,
    loadSections,
    loadSubjectsTeachers,
    createTemplate,
    updateTemplate,
    deactivateTemplate,
    createSlot,
    updateSlot,
    deleteSlot,
    createSubstitute,
    getTemplate,
    getSlot,
    refetch:
      tab === 'templates'
        ? loadTemplates
        : loadSlots,
  };
}
