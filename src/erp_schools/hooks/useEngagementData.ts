/**
 * useEngagementData — web StudentEngagementTab parity.
 * Loads the active sub-tab only (avoids refetch storms).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  studentCouncilsApi,
  councilMembersApi,
  studentGrievancesApi,
  eventsApi,
  eventRegistrationsApi,
  galleryApi,
} from '@core/api/erp.api';
import {
  extractErrorMessage,
  pickNumber,
  pickString,
  safeList,
  type LoadStatus,
} from '../utils/apiHelpers';
import { useSchoolsSession } from './useSchoolsSession';
import type { EngagementTabKey } from '../utils/engagementMeta';

export type EngRow = {
  id: string;
  numericId: number;
  title: string;
  subtitle: string;
  meta: string;
  status: string;
  isActive: boolean;
  raw: Record<string, unknown>;
};

function mapCouncil(r: Record<string, unknown>, i: number): EngRow {
  const numericId = pickNumber(r.id, i + 1);
  return {
    id: String(numericId),
    numericId,
    title: pickString(r.name, 'Council'),
    subtitle: `${pickString(r.council_type, 'general').replace(/_/g, ' ')}${pickString(r.academic_year) ? ` · ${pickString(r.academic_year)}` : ''}`,
    meta: pickString(r.description),
    status: pickString(r.status, 'active') || 'active',
    isActive: r.is_active !== false,
    raw: r,
  };
}

function mapMember(r: Record<string, unknown>, i: number): EngRow {
  const numericId = pickNumber(r.id, i + 1);
  return {
    id: String(numericId),
    numericId,
    title: `Student #${pickNumber(r.student_id)}`,
    subtitle: `Council #${pickNumber(r.council_id)} · ${pickString(r.role, 'member').replace(/_/g, ' ')}`,
    meta: pickString(r.joined_date).slice(0, 10),
    status: pickString(r.status, 'active') || 'active',
    isActive: r.is_active !== false,
    raw: r,
  };
}

function mapGrievance(r: Record<string, unknown>, i: number): EngRow {
  const numericId = pickNumber(r.id, i + 1);
  return {
    id: String(numericId),
    numericId,
    title: pickString(r.subject, 'Grievance'),
    subtitle: `${pickString(r.grievance_type, 'general').replace(/_/g, ' ')} · ${pickString(r.priority, 'medium')}`,
    meta: pickString(r.description),
    status: pickString(r.status, 'submitted') || 'submitted',
    isActive: r.is_active !== false,
    raw: r,
  };
}

function mapEvent(r: Record<string, unknown>, i: number): EngRow {
  const numericId = pickNumber(r.id, i + 1);
  const start = pickString(r.start_date).slice(0, 10);
  return {
    id: String(numericId),
    numericId,
    title: pickString(r.title, r.name, 'Event'),
    subtitle: `${pickString(r.event_type, 'general').replace(/_/g, ' ')}${pickString(r.venue) ? ` · ${pickString(r.venue)}` : ''}`,
    meta: start,
    status: pickString(r.status, 'upcoming') || 'upcoming',
    isActive: r.is_active !== false,
    raw: r,
  };
}

function mapRegistration(r: Record<string, unknown>, i: number): EngRow {
  const numericId = pickNumber(r.id, i + 1);
  const attended = r.attendance_marked === true;
  const regDate = pickString(r.registration_date).slice(0, 10);
  return {
    id: String(numericId),
    numericId,
    title: `Event #${pickNumber(r.event_id)}`,
    subtitle: `Student #${pickNumber(r.student_id)}${regDate ? ` · ${regDate}` : ''}`,
    meta: attended ? 'Attended ✓' : '—',
    status: attended ? 'completed' : 'submitted',
    isActive: r.is_active !== false,
    raw: r,
  };
}

function mapGallery(r: Record<string, unknown>, i: number): EngRow {
  const numericId = pickNumber(r.id, i + 1);
  return {
    id: String(numericId),
    numericId,
    title: pickString(r.title, r.name, 'Media'),
    subtitle: `${pickString(r.category, 'general').replace(/_/g, ' ')} · ${pickString(r.media_type, 'image')}`,
    meta: pickString(r.media_url),
    status: r.is_featured ? 'featured' : 'active',
    isActive: r.is_active !== false,
    raw: r,
  };
}

function unwrap(data: unknown): Record<string, unknown> {
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (o.data && typeof o.data === 'object' && !Array.isArray(o.data)) {
      return o.data as Record<string, unknown>;
    }
    return o;
  }
  return {};
}

export function useEngagementData(activeTab: EngagementTabKey) {
  const { schoolId, isStudent } = useSchoolsSession();
  // Web: anyone with the tab can manage; students don't get the tab on web.
  const canManage = !isStudent;

  const [status, setStatus] = useState<LoadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<EngRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterA, setFilterA] = useState('');
  const [filterB, setFilterB] = useState('');
  const perPage = 25;

  // Reset paging/filters when tab changes
  useEffect(() => {
    setPage(1);
    setFilterA('');
    setFilterB('');
    setRows([]);
    setTotal(0);
  }, [activeTab]);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const base: Record<string, string | number> = {
        page,
        per_page: perPage,
      };
      if (schoolId) base.school_id = schoolId;

      let data: unknown;
      let mapper: (r: Record<string, unknown>, i: number) => EngRow;

      switch (activeTab) {
        case 'councils':
          if (filterA) base.council_type = filterA;
          data = await studentCouncilsApi.list(base);
          mapper = mapCouncil;
          break;
        case 'members':
          if (filterA) base.role = filterA;
          data = await councilMembersApi.list(base);
          mapper = mapMember;
          break;
        case 'grievances':
          if (filterA) base.grievance_type = filterA;
          if (filterB) base.status = filterB;
          data = await studentGrievancesApi.list(base);
          mapper = mapGrievance;
          break;
        case 'events':
          if (filterA) base.event_type = filterA;
          if (filterB) base.status = filterB;
          data = await eventsApi.list(base);
          mapper = mapEvent;
          break;
        case 'registrations':
          if (filterA) base.event_id = Number(filterA);
          data = await eventRegistrationsApi.list(base);
          mapper = mapRegistration;
          break;
        case 'gallery':
          if (filterA) base.category = filterA;
          data = await galleryApi.list(base);
          mapper = mapGallery;
          break;
        default:
          data = { items: [] };
          mapper = mapCouncil;
      }

      const items = safeList<Record<string, unknown>>(data).map(mapper);
      const t =
        data && typeof data === 'object' && 'total' in (data as object)
          ? pickNumber((data as Record<string, unknown>).total, items.length)
          : items.length;
      setRows(items);
      setTotal(t);
      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e));
      setRows([]);
      setTotal(0);
      setStatus('error');
    }
  }, [activeTab, schoolId, page, filterA, filterB]);

  useEffect(() => {
    void load();
  }, [load]);

  const getRecord = useCallback(
    async (id: number): Promise<Record<string, unknown> | null> => {
      const cached = rows.find((r) => r.numericId === id);
      if (cached) return cached.raw;
      try {
        let raw: unknown;
        switch (activeTab) {
          case 'councils':
            raw = await studentCouncilsApi.get(id, schoolId ?? undefined);
            break;
          case 'members':
            raw = await councilMembersApi.get(id, schoolId ?? undefined);
            break;
          case 'grievances':
            raw = await studentGrievancesApi.get(id, schoolId ?? undefined);
            break;
          case 'events':
            raw = await eventsApi.get(id, schoolId ?? undefined);
            break;
          case 'registrations':
            raw = await eventRegistrationsApi.get(id, schoolId ?? undefined);
            break;
          case 'gallery':
            raw = await galleryApi.get(id, schoolId ?? undefined);
            break;
          default:
            return null;
        }
        return unwrap(raw);
      } catch {
        return null;
      }
    },
    [activeTab, rows, schoolId],
  );

  const saveRecord = useCallback(
    async (payload: Record<string, unknown>, editingId?: number) => {
      if (!schoolId && !editingId) {
        setError('School not found.');
        return false;
      }
      setSaving(true);
      setError(null);
      try {
        const body = { ...payload, school_id: schoolId };
        if (editingId) {
          const { id, created_at, updated_at, resolved_at, registration_date, ...upd } =
            body as Record<string, unknown>;
          void id;
          void created_at;
          void updated_at;
          void resolved_at;
          void registration_date;
          switch (activeTab) {
            case 'councils':
              await studentCouncilsApi.update(editingId, upd, schoolId ?? undefined);
              break;
            case 'members':
              await councilMembersApi.update(editingId, upd, schoolId ?? undefined);
              break;
            case 'grievances':
              await studentGrievancesApi.update(editingId, upd, schoolId ?? undefined);
              break;
            case 'events':
              await eventsApi.update(editingId, upd, schoolId ?? undefined);
              break;
            case 'registrations':
              await eventRegistrationsApi.update(
                editingId,
                {
                  attendance_marked: upd.attendance_marked,
                  remarks: upd.remarks,
                  is_active: upd.is_active,
                },
                schoolId ?? undefined,
              );
              break;
            case 'gallery':
              await galleryApi.update(editingId, upd, schoolId ?? undefined);
              break;
          }
        } else {
          switch (activeTab) {
            case 'councils':
              await studentCouncilsApi.create(body);
              break;
            case 'members':
              await councilMembersApi.create(body);
              break;
            case 'grievances':
              await studentGrievancesApi.create(body);
              break;
            case 'events':
              await eventsApi.create(body);
              break;
            case 'registrations':
              await eventRegistrationsApi.create(body);
              break;
            case 'gallery':
              await galleryApi.create(body);
              break;
          }
        }
        setPage(1);
        await load();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [activeTab, schoolId, load],
  );

  const deactivateRecord = useCallback(
    async (id: number) => {
      setSaving(true);
      setError(null);
      try {
        switch (activeTab) {
          case 'councils':
            await studentCouncilsApi.softDelete(id, schoolId ?? undefined);
            break;
          case 'members':
            await councilMembersApi.softDelete(id, schoolId ?? undefined);
            break;
          case 'grievances':
            await studentGrievancesApi.softDelete(id, schoolId ?? undefined);
            break;
          case 'events':
            await eventsApi.softDelete(id, schoolId ?? undefined);
            break;
          case 'registrations':
            await eventRegistrationsApi.softDelete(id, schoolId ?? undefined);
            break;
          case 'gallery':
            await galleryApi.softDelete(id, schoolId ?? undefined);
            break;
        }
        await load();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [activeTab, schoolId, load],
  );

  const pages = Math.max(1, Math.ceil(total / perPage));

  return useMemo(
    () => ({
      canManage,
      status,
      error,
      saving,
      rows,
      total,
      page,
      pages,
      setPage,
      filterA,
      setFilterA: (v: string) => {
        setFilterA(v);
        setPage(1);
      },
      filterB,
      setFilterB: (v: string) => {
        setFilterB(v);
        setPage(1);
      },
      loading: status === 'loading' || status === 'idle',
      refetch: load,
      getRecord,
      saveRecord,
      deactivateRecord,
      schoolId,
    }),
    [
      canManage,
      status,
      error,
      saving,
      rows,
      total,
      page,
      pages,
      filterA,
      filterB,
      load,
      getRecord,
      saveRecord,
      deactivateRecord,
      schoolId,
    ],
  );
}
