/**
 * useTeacherExamsData — web ExamsTab parity for instructors.
 * Uses only /api/v1/erp/exams/* (never useAdminData — avoids 403 logout).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  examGroupsApi,
  examGroupItemsApi,
  examAllItemsApi,
  examSubjectsApi,
  examStudentsApi,
  examGradesApi,
  examMarksApi,
  examResultsApi,
  examSectionsApi,
  academicClassesApi,
} from '@core/api/erp.api';
import {
  extractErrorMessage,
  pickNumber,
  pickString,
  safeList,
  type LoadStatus,
} from '../utils/apiHelpers';
import { useSchoolsSession } from './useSchoolsSession';
import type { ExamTabKey } from '../utils/examMeta';

export type ExamGroupRow = {
  id: number;
  name: string;
  examType: string;
  description: string;
  status: string;
  examCount: number;
  isActive: boolean;
  raw: Record<string, unknown>;
};

export type ExamItemRow = {
  id: number;
  groupId: number;
  groupName: string;
  name: string;
  session: string;
  isPublished: boolean;
  isResultPublished: boolean;
  isActive: boolean;
  raw: Record<string, unknown>;
};

export type SchoolClassOption = {
  id: number;
  name: string;
};

export type SchoolSectionOption = {
  id: number;
  name: string;
};

export type ScheduleRow = {
  id: string;
  itemId: number;
  groupId: number;
  subjectId: number;
  examSubjectId: number;
  date: string;
  startTime: string;
  durationMins: number;
  subjectName: string;
  className: string;
  classId: number;
  examName: string;
  groupName: string;
  venue: string;
  maxMarks: number;
  minMarks: number;
};

function mapGroup(r: Record<string, unknown>): ExamGroupRow {
  return {
    id: pickNumber(r.id),
    name: pickString(r.name, 'Exam Group'),
    examType: pickString(r.exam_type, 'General'),
    description: pickString(r.description),
    status: pickString(r.status, 'Draft'),
    examCount: pickNumber(r.exam_count, 0),
    isActive: r.is_active !== false,
    raw: r,
  };
}

function mapItem(r: Record<string, unknown>, groupNameFallback = ''): ExamItemRow {
  return {
    id: pickNumber(r.id),
    groupId: pickNumber(r.exam_group_id),
    groupName: pickString(r.exam_group_name, groupNameFallback),
    name: pickString(r.name, 'Exam'),
    session: pickString(r.session),
    isPublished: r.is_published === true,
    isResultPublished: r.is_result_published === true,
    isActive: r.is_active !== false,
    raw: r,
  };
}

function unwrapList(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  return safeList(data);
}

export function useTeacherExamsData(activeTab: ExamTabKey) {
  const { schoolId } = useSchoolsSession();
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [groups, setGroups] = useState<ExamGroupRow[]>([]);
  const [allItems, setAllItems] = useState<ExamItemRow[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClassOption[]>([]);
  const [schoolSections, setSchoolSections] = useState<SchoolSectionOption[]>([]);

  const loadSchoolLookups = useCallback(async () => {
    if (!schoolId) return;
    try {
      const [cls, secs] = await Promise.all([
        academicClassesApi.list(schoolId),
        examSectionsApi.list(schoolId),
      ]);
      setSchoolClasses(
        unwrapList(cls)
          .map((r) => ({
            id: pickNumber(r.class_id, pickNumber(r.id)),
            name: pickString(r.class_name, r.name, `Class ${pickNumber(r.class_id, pickNumber(r.id))}`),
          }))
          .filter((c) => c.id > 0)
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
      );
      setSchoolSections(
        unwrapList(secs)
          .map((r) => ({
            id: pickNumber(r.section_id, pickNumber(r.id)),
            name: pickString(r.section_name, r.name, `Section ${pickNumber(r.section_id)}`),
          }))
          .filter((s) => s.id > 0),
      );
    } catch {
      // Keep empty — filters still work with All Classes
    }
  }, [schoolId]);

  const loadGroups = useCallback(async () => {
    if (!schoolId) return;
    const data = await examGroupsApi.list({
      school_id: schoolId,
      is_active: true,
      page: 1,
      per_page: 100,
    });
    setGroups(unwrapList(data).map(mapGroup).filter((g) => g.isActive));
  }, [schoolId]);

  const loadAllItems = useCallback(async () => {
    if (!schoolId) return;
    const data = await examAllItemsApi.list(schoolId);
    setAllItems(
      unwrapList(data)
        .map((r) => mapItem(r))
        .filter((i) => i.isActive),
    );
  }, [schoolId]);

  const loadSchedules = useCallback(async () => {
    if (!schoolId) return;
    const data = await examAllItemsApi.list(schoolId);
    const items = unwrapList(data)
      .map((r) => mapItem(r))
      .filter((i) => i.isActive);
    setAllItems(items);

    const settled = await Promise.allSettled(
      items.map(async (item) => {
        const subj = await examSubjectsApi.list(item.id, schoolId);
        return unwrapList(subj)
          .filter((s) => s.is_active !== false && pickString(s.exam_date))
          .map((s): ScheduleRow => ({
            id: `${item.id}-${pickNumber(s.id)}`,
            itemId: item.id,
            groupId: item.groupId,
            subjectId: pickNumber(s.subject_id),
            examSubjectId: pickNumber(s.id),
            date: pickString(s.exam_date).slice(0, 10),
            startTime: pickString(s.start_time),
            durationMins: pickNumber(s.duration_mins, 0),
            subjectName: pickString(s.subject_name, 'Subject'),
            className: pickString(s.class_name, 'Class'),
            classId: pickNumber(s.class_id),
            examName: item.name,
            groupName: item.groupName,
            venue: pickString(s.room_no, '—'),
            maxMarks: pickNumber(s.max_marks, 100),
            minMarks: pickNumber(s.min_marks, 0),
          }));
      }),
    );

    const rows: ScheduleRow[] = [];
    settled.forEach((res) => {
      if (res.status === 'fulfilled') rows.push(...res.value);
    });
    rows.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    setSchedules(rows);
  }, [schoolId]);

  const load = useCallback(async () => {
    if (!schoolId) {
      setStatus('ready');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      // School-wide class/section lists (web Marks/Results parity — not teacher-assigned only)
      await loadSchoolLookups();
      if (activeTab === 'groups') {
        await loadGroups();
      } else if (activeTab === 'exams' || activeTab === 'marks' || activeTab === 'results' || activeTab === 'documents') {
        await loadAllItems();
      } else if (activeTab === 'schedules') {
        await loadSchedules();
      }
      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e));
      setStatus('error');
    }
  }, [schoolId, activeTab, loadGroups, loadAllItems, loadSchedules, loadSchoolLookups]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadGroupItems = useCallback(
    async (groupId: number): Promise<ExamItemRow[]> => {
      if (!schoolId) return [];
      const data = await examGroupItemsApi.list(groupId, {
        school_id: schoolId,
        page: 1,
        per_page: 100,
      });
      const group = groups.find((g) => g.id === groupId);
      return unwrapList(data)
        .map((r) => mapItem(r, group?.name))
        .filter((i) => i.isActive);
    },
    [schoolId, groups],
  );

  const saveGroup = useCallback(
    async (payload: Record<string, unknown>, editingId?: number) => {
      if (!schoolId) {
        setError('School not found.');
        return false;
      }
      setSaving(true);
      setError(null);
      try {
        if (editingId) {
          const { id, created_at, updated_at, exam_count, status, ...upd } = payload;
          void id;
          void created_at;
          void updated_at;
          void exam_count;
          void status;
          await examGroupsApi.update(editingId, upd, schoolId);
        } else {
          await examGroupsApi.create({ ...payload, school_id: schoolId });
        }
        await loadGroups();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId, loadGroups],
  );

  const deactivateGroup = useCallback(
    async (groupId: number) => {
      if (!schoolId) return false;
      setSaving(true);
      try {
        await examGroupsApi.softDelete(groupId, schoolId);
        await loadGroups();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId, loadGroups],
  );

  const saveItem = useCallback(
    async (groupId: number, payload: Record<string, unknown>, editingId?: number) => {
      if (!schoolId) {
        setError('School not found.');
        return false;
      }
      setSaving(true);
      setError(null);
      try {
        if (editingId) {
          const { id, created_at, updated_at, exam_group_id, school_id, ...upd } = payload;
          void id;
          void created_at;
          void updated_at;
          void exam_group_id;
          void school_id;
          await examGroupItemsApi.update(groupId, editingId, upd, schoolId);
        } else {
          await examGroupItemsApi.create(groupId, {
            ...payload,
            exam_group_id: groupId,
            school_id: schoolId,
          });
        }
        return true;
      } catch (e) {
        setError(extractErrorMessage(e));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId],
  );

  const deactivateItem = useCallback(
    async (groupId: number, itemId: number) => {
      if (!schoolId) return false;
      setSaving(true);
      try {
        await examGroupItemsApi.softDelete(groupId, itemId, schoolId);
        return true;
      } catch (e) {
        setError(extractErrorMessage(e));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId],
  );

  // Re-export APIs for detail screens (single schoolId binding)
  const apis = useMemo(
    () => ({
      groupsApi: {
        get: (id: number) => examGroupsApi.get(id, schoolId ?? undefined),
      },
      itemsApi: {
        get: (groupIdArg: number, itemId: number) =>
          examGroupItemsApi.get(groupIdArg, itemId, schoolId ?? undefined),
      },
      subjects: {
        list: (itemId: number) => examSubjectsApi.list(itemId, schoolId ?? undefined),
        create: (itemId: number, data: Record<string, unknown>) =>
          examSubjectsApi.create(itemId, { ...data, school_id: schoolId }, schoolId ?? undefined),
        update: (itemId: number, entryId: number, data: Record<string, unknown>) =>
          examSubjectsApi.update(itemId, entryId, data, schoolId ?? undefined),
        remove: (itemId: number, entryId: number) =>
          examSubjectsApi.softDelete(itemId, entryId, schoolId ?? undefined),
        importFromClass: (itemId: number, data: Record<string, unknown>) =>
          examSubjectsApi.importFromClass(itemId, data, schoolId ?? undefined),
        byClass: (classId: number) => examSubjectsApi.getByClass(classId, schoolId ?? undefined),
      },
      students: {
        list: (itemId: number) => examStudentsApi.list(itemId, schoolId ?? undefined),
        bulkAssign: (itemId: number, data: Record<string, unknown>) =>
          examStudentsApi.bulkAssign(itemId, data, schoolId ?? undefined),
        bulkRemove: (itemId: number, data: Record<string, unknown>) =>
          examStudentsApi.bulkRemove(itemId, data, schoolId ?? undefined),
        removeAll: (itemId: number) =>
          examStudentsApi.removeAll(itemId, schoolId ?? undefined),
        byClass: (itemId: number, classId: number, sectionId?: number) =>
          examStudentsApi.studentsByClass(itemId, classId, {
            school_id: schoolId ?? undefined,
            section_id: sectionId,
          }),
      },
      grades: {
        list: (groupId: number) => examGradesApi.list(groupId, schoolId ?? undefined),
        bulkSave: (groupId: number, grades: Record<string, unknown>[]) =>
          examGradesApi.bulkSave(groupId, { grades }, schoolId ?? undefined),
        applyTemplate: (groupId: number, template: string) =>
          examGradesApi.applyTemplate(groupId, { template }, schoolId ?? undefined),
      },
      marks: {
        getGrid: (itemId: number, examSubjectId: number) =>
          examMarksApi.getGrid(itemId, examSubjectId, schoolId ?? undefined),
        bulkSave: (itemId: number, examSubjectId: number, rows: Record<string, unknown>[]) =>
          examMarksApi.bulkSave(itemId, examSubjectId, { rows }, schoolId ?? undefined),
        getProgress: (itemId: number) =>
          examMarksApi.getProgress(itemId, schoolId ?? undefined),
        getTemplate: (itemId: number, filters?: { class_id?: number; section_id?: number }) =>
          examMarksApi.getTemplate(itemId, schoolId ?? undefined, filters),
      },
      results: {
        view: (itemId: number, filters?: { class_id?: number; section_id?: number }) =>
          examResultsApi.view(itemId, schoolId ?? undefined, filters),
        generate: (itemId: number) =>
          examResultsApi.generate(itemId, schoolId ?? undefined),
        publish: (itemId: number) =>
          examResultsApi.publish(itemId, schoolId ?? undefined),
      },
      sections: {
        list: () => examSectionsApi.list(schoolId ?? undefined),
      },
    }),
    [schoolId],
  );

  return useMemo(
    () => ({
      schoolId,
      status,
      error,
      saving,
      loading: status === 'loading' || status === 'idle',
      groups,
      allItems,
      schedules,
      schoolClasses,
      schoolSections,
      refetch: load,
      loadGroups,
      loadAllItems,
      loadGroupItems,
      saveGroup,
      deactivateGroup,
      saveItem,
      deactivateItem,
      apis,
      setError,
    }),
    [
      schoolId,
      status,
      error,
      saving,
      groups,
      allItems,
      schedules,
      schoolClasses,
      schoolSections,
      load,
      loadGroups,
      loadAllItems,
      loadGroupItems,
      saveGroup,
      deactivateGroup,
      saveItem,
      deactivateItem,
      apis,
    ],
  );
}
