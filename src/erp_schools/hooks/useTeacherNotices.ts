/**
 * useTeacherNotices — live notice board list (web NoticesTab parity).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { USE_MOCK_DATA } from '../config';
import type { Notice, NoticeCategory, NoticeScope } from '../types/domain';
import {
  formatDisplayDate,
  pickNumber,
  pickString,
  type LoadStatus,
} from '../utils/apiHelpers';
import { useTeacherNoticeActions } from './useTeacherNoticeActions';

function mapNotice(n: Record<string, unknown>, i: number): Notice {
  const category = pickString(n.category, 'general').toLowerCase() || 'general';
  const scopeRaw = pickString(n.target_audience, n.scope).toLowerCase();
  const scope: NoticeScope = scopeRaw.includes('class')
    ? 'class'
    : scopeRaw.includes('group')
      ? 'group'
      : 'school';
  const publish = pickString(n.publish_date, n.created_at, n.date);
  const publishDay = publish.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const scheduled = Boolean(publishDay && publishDay > today);
  const noticeId = pickNumber(n.id, i + 1);
  return {
    id: String(noticeId || `notice-${i}`),
    noticeId,
    scope,
    category: category as NoticeCategory,
    title: pickString(n.title, n.subject, 'Notice'),
    body: pickString(n.content, n.body, n.description),
    date: formatDisplayDate(publish || null) || publishDay || '—',
    publishDate: publishDay || undefined,
    expiryDate: pickString(n.expiry_date).slice(0, 10) || undefined,
    author: pickString(n.author_name, n.created_by_name, 'School'),
    audience: pickString(n.category, category),
    pinned: Boolean(n.is_pinned),
    scheduled,
    isActive: n.is_active !== false,
  };
}

export function useTeacherNotices(opts?: { category?: string; q?: string }) {
  const { listNotices, deactivateNotice, saving, error } = useTeacherNoticeActions();
  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    if (USE_MOCK_DATA) {
      setStatus('ready');
      return;
    }
    setStatus((s) => (s === 'ready' ? 'loading' : 'loading'));
    const res = await listNotices({
      q: opts?.q,
      category: opts?.category,
    });
    const mapped = res.items.map((n, i) => mapNotice(n, i));
    // Pinned first (web sorts via pin flag display)
    mapped.sort((a, b) => Number(b.pinned) - Number(a.pinned));
    setNotices(mapped);
    setTotal(res.total || mapped.length);
    setStatus('ready');
  }, [listNotices, opts?.q, opts?.category]);

  // Reload when search / category filters change (initial load via screen focus)
  useEffect(() => {
    if (USE_MOCK_DATA) return;
    void load();
  }, [load]);

  const pinnedCount = useMemo(
    () => notices.filter((n) => n.pinned).length,
    [notices],
  );

  const removeLocal = useCallback((noticeId: number) => {
    setNotices((prev) => prev.filter((n) => n.noticeId !== noticeId));
    setTotal((t) => Math.max(0, t - 1));
  }, []);

  return {
    notices,
    total,
    pinnedCount,
    status,
    error,
    saving,
    refetch: load,
    deactivateNotice: async (noticeId: number) => {
      const ok = await deactivateNotice(noticeId);
      if (ok) removeLocal(noticeId);
      return ok;
    },
  };
}
