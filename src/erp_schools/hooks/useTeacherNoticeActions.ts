/**
 * useTeacherNoticeActions — notices CRUD matching web NoticesTab.
 * APIs: noticesApi.getAll / get / create / update / softDelete
 */

import { useCallback, useState } from 'react';
import { noticesApi } from '@core/api/erp.api';
import type { NoticeCategory } from '../types/domain';
import { extractErrorMessage, pickNumber, pickString, safeList } from '../utils/apiHelpers';
import { useSchoolsSession } from './useSchoolsSession';

export type NoticeFormPayload = {
  title: string;
  content: string;
  category?: NoticeCategory | string;
  is_pinned?: boolean;
  publish_date?: string;
  expiry_date?: string;
};

export function useTeacherNoticeActions() {
  const { schoolId } = useSchoolsSession();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createNotice = useCallback(
    async (payload: NoticeFormPayload): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        await noticesApi.create({
          school_id: schoolId ?? undefined,
          title: payload.title.trim(),
          content: payload.content.trim(),
          category: payload.category || 'general',
          is_pinned: Boolean(payload.is_pinned),
          publish_date: payload.publish_date || undefined,
          expiry_date: payload.expiry_date || undefined,
        });
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Failed to publish notice'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId],
  );

  const updateNotice = useCallback(
    async (noticeId: number, payload: NoticeFormPayload): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        await noticesApi.update(
          noticeId,
          {
            title: payload.title.trim(),
            content: payload.content.trim(),
            category: payload.category || 'general',
            is_pinned: Boolean(payload.is_pinned),
            publish_date: payload.publish_date || undefined,
            expiry_date: payload.expiry_date || undefined,
          },
          schoolId ?? undefined,
        );
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Failed to update notice'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId],
  );

  const deactivateNotice = useCallback(
    async (noticeId: number) => {
      setSaving(true);
      setError(null);
      try {
        await noticesApi.softDelete(noticeId, schoolId ?? undefined);
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Failed to deactivate notice'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId],
  );

  const getNotice = useCallback(
    async (noticeId: number) => {
      setError(null);
      try {
        const raw = await noticesApi.get(noticeId, schoolId ?? undefined);
        const n = (raw ?? {}) as Record<string, unknown>;
        return {
          id: pickNumber(n.id, noticeId),
          title: pickString(n.title),
          content: pickString(n.content, n.body),
          category: pickString(n.category, 'general'),
          is_pinned: Boolean(n.is_pinned),
          publish_date: pickString(n.publish_date).slice(0, 10),
          expiry_date: pickString(n.expiry_date).slice(0, 10),
          is_active: n.is_active !== false,
          created_at: pickString(n.created_at),
        };
      } catch (e) {
        setError(extractErrorMessage(e, 'Failed to load notice'));
        return null;
      }
    },
    [schoolId],
  );

  const listNotices = useCallback(
    async (opts?: { q?: string; category?: string; page?: number }) => {
      setError(null);
      try {
        const raw = await noticesApi.getAll({
          school_id: schoolId ?? undefined,
          q: opts?.q || undefined,
          category: opts?.category || undefined,
          page: opts?.page ?? 1,
          per_page: 50,
          is_active: true,
        });
        return {
          items: safeList<Record<string, unknown>>(raw),
          total: pickNumber(
            (raw as { total?: unknown })?.total,
            safeList(raw).length,
          ),
        };
      } catch (e) {
        setError(extractErrorMessage(e, 'Failed to load notices'));
        return { items: [], total: 0 };
      }
    },
    [schoolId],
  );

  return {
    saving,
    error,
    createNotice,
    updateNotice,
    deactivateNotice,
    getNotice,
    listNotices,
  };
}
