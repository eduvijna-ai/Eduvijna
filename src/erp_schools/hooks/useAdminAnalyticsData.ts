/**
 * Admin Analytics — web AnalyticsTab parity.
 * Report Templates · Snapshots · Dashboard Widgets (+ soft-deactivate).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  reportTemplatesApi,
  reportSnapshotsApi,
  dashboardWidgetsApi,
} from '@core/api/erp.api';
import { USE_MOCK_DATA } from '../config';
import {
  extractErrorMessage,
  pickNumber,
  pickString,
  safeList,
  type LoadStatus,
} from '../utils/apiHelpers';
import { useSchoolsSession } from './useSchoolsSession';

export type AdminAnalyticsTab = 'templates' | 'snapshots' | 'widgets' | 'documents';

export type ReportTemplateRow = {
  id: number;
  schoolId: number;
  name: string;
  description: string;
  reportType: string;
  module: string;
  queryConfig: unknown;
  columns: unknown;
  filters: unknown;
  chartType: string;
  isSystem: boolean;
  isActive: boolean;
};

export type ReportSnapshotRow = {
  id: number;
  schoolId: number;
  templateId: number | null;
  title: string;
  reportData: unknown;
  summary: unknown;
  format: string;
  fileUrl: string;
  parameters: unknown;
  isActive: boolean;
  createdAt: string;
};

export type DashboardWidgetRow = {
  id: number;
  schoolId: number;
  title: string;
  widgetType: string;
  module: string;
  config: unknown;
  size: string;
  position: number;
  isActive: boolean;
};

export type TemplateForm = {
  name: string;
  description: string;
  reportType: string;
  module: string;
  chartType: string;
  queryConfigText: string;
  columnsText: string;
  filtersText: string;
  isSystem: boolean;
};

export type SnapshotForm = {
  templateId: string;
  title: string;
  format: string;
  reportDataText: string;
  summaryText: string;
  parametersText: string;
  fileUrl: string;
};

export type WidgetForm = {
  title: string;
  widgetType: string;
  module: string;
  configText: string;
  size: string;
  position: string;
};

const PER_PAGE = 25;

function mapTemplate(r: Record<string, unknown>): ReportTemplateRow {
  return {
    id: pickNumber(r.id),
    schoolId: pickNumber(r.school_id),
    name: pickString(r.name),
    description: pickString(r.description),
    reportType: pickString(r.report_type, 'custom').toLowerCase(),
    module: pickString(r.module),
    queryConfig: r.query_config ?? {},
    columns: r.columns ?? [],
    filters: r.filters ?? {},
    chartType: pickString(r.chart_type),
    isSystem: r.is_system === true,
    isActive: r.is_active !== false,
  };
}

function mapSnapshot(r: Record<string, unknown>): ReportSnapshotRow {
  return {
    id: pickNumber(r.id),
    schoolId: pickNumber(r.school_id),
    templateId:
      r.template_id != null && r.template_id !== ''
        ? pickNumber(r.template_id)
        : null,
    title: pickString(r.title),
    reportData: r.report_data ?? {},
    summary: r.summary ?? {},
    format: pickString(r.format, 'json').toLowerCase(),
    fileUrl: pickString(r.file_url),
    parameters: r.parameters ?? {},
    isActive: r.is_active !== false,
    createdAt: pickString(r.created_at).slice(0, 10),
  };
}

function mapWidget(r: Record<string, unknown>): DashboardWidgetRow {
  return {
    id: pickNumber(r.id),
    schoolId: pickNumber(r.school_id),
    title: pickString(r.title),
    widgetType: pickString(r.widget_type, 'kpi').toLowerCase(),
    module: pickString(r.module),
    config: r.config ?? {},
    size: pickString(r.size, 'medium').toLowerCase(),
    position: pickNumber(r.position),
    isActive: r.is_active !== false,
  };
}

function totalFrom(raw: unknown, fallback: number): number {
  if (raw && typeof raw === 'object' && 'total' in (raw as object)) {
    return pickNumber((raw as Record<string, unknown>).total, fallback);
  }
  return fallback;
}

export function useAdminAnalyticsData() {
  const { schoolId: sid, userId } = useSchoolsSession();
  const schoolId = sid ?? undefined;
  const actorId = userId ?? 1;

  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [templates, setTemplates] = useState<ReportTemplateRow[]>([]);
  const [snapshots, setSnapshots] = useState<ReportSnapshotRow[]>([]);
  const [widgets, setWidgets] = useState<DashboardWidgetRow[]>([]);

  const [templateTotal, setTemplateTotal] = useState(0);
  const [snapshotTotal, setSnapshotTotal] = useState(0);
  const [widgetTotal, setWidgetTotal] = useState(0);

  const [templatePage, setTemplatePage] = useState(1);
  const [snapshotPage, setSnapshotPage] = useState(1);
  const [widgetPage, setWidgetPage] = useState(1);

  const [typeFilter, setTypeFilter] = useState('');
  const [formatFilter, setFormatFilter] = useState('');
  const [widgetTypeFilter, setWidgetTypeFilter] = useState('');

  const loadTemplates = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await reportTemplatesApi.list({
        report_type: typeFilter || undefined,
        page: templatePage,
        per_page: PER_PAGE,
        school_id: schoolId,
      });
      const items = safeList<Record<string, unknown>>(raw).map(mapTemplate);
      setTemplates(items);
      setTemplateTotal(totalFrom(raw, items.length));
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load templates'));
      setTemplates([]);
      setTemplateTotal(0);
    }
  }, [schoolId, templatePage, typeFilter]);

  const loadSnapshots = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await reportSnapshotsApi.list({
        format: formatFilter || undefined,
        page: snapshotPage,
        per_page: PER_PAGE,
        school_id: schoolId,
      });
      const items = safeList<Record<string, unknown>>(raw).map(mapSnapshot);
      setSnapshots(items);
      setSnapshotTotal(totalFrom(raw, items.length));
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load snapshots'));
      setSnapshots([]);
      setSnapshotTotal(0);
    }
  }, [schoolId, snapshotPage, formatFilter]);

  const loadWidgets = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await dashboardWidgetsApi.list({
        widget_type: widgetTypeFilter || undefined,
        page: widgetPage,
        per_page: PER_PAGE,
        school_id: schoolId,
      });
      const items = safeList<Record<string, unknown>>(raw).map(mapWidget);
      setWidgets(items);
      setWidgetTotal(totalFrom(raw, items.length));
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load widgets'));
      setWidgets([]);
      setWidgetTotal(0);
    }
  }, [schoolId, widgetPage, widgetTypeFilter]);

  const bootstrap = useCallback(async () => {
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
      await loadTemplates();
      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e));
      setStatus('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status !== 'ready') return;
    void loadTemplates();
  }, [status, loadTemplates]);

  useEffect(() => {
    if (status !== 'ready') return;
    void loadSnapshots();
  }, [status, loadSnapshots]);

  useEffect(() => {
    if (status !== 'ready') return;
    void loadWidgets();
  }, [status, loadWidgets]);

  const setTypeFilterAndReset = useCallback((v: string) => {
    setTypeFilter(v);
    setTemplatePage(1);
  }, []);

  const setFormatFilterAndReset = useCallback((v: string) => {
    setFormatFilter(v);
    setSnapshotPage(1);
  }, []);

  const setWidgetTypeFilterAndReset = useCallback((v: string) => {
    setWidgetTypeFilter(v);
    setWidgetPage(1);
  }, []);

  const saveTemplate = useCallback(
    async (form: TemplateForm, editingId?: number) => {
      if (!form.name.trim()) {
        setError('Name required');
        return false;
      }
      let query_config: unknown;
      let columns: unknown;
      let filters: unknown;
      try {
        query_config = JSON.parse(form.queryConfigText || '{}');
        columns = JSON.parse(form.columnsText || '[]');
        filters = JSON.parse(form.filtersText || '{}');
      } catch {
        setError('Invalid JSON');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const payload: Record<string, unknown> = {
          school_id: schoolId,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          report_type: form.reportType || 'custom',
          module: form.module.trim() || undefined,
          chart_type: form.chartType.trim() || null,
          query_config,
          columns,
          filters,
          created_by: actorId,
          is_system: !!form.isSystem,
        };
        if (editingId) {
          const { school_id: _s, created_by: _c, ...upd } = payload;
          await reportTemplatesApi.update(editingId, upd, schoolId);
        } else {
          await reportTemplatesApi.create(payload);
        }
        setTemplatePage(1);
        await loadTemplates();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, actorId, loadTemplates],
  );

  const removeTemplate = useCallback(
    async (id: number) => {
      setBusy(true);
      setError(null);
      try {
        await reportTemplatesApi.softDelete(id, schoolId);
        await loadTemplates();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadTemplates],
  );

  const saveSnapshot = useCallback(
    async (form: SnapshotForm, editingId?: number) => {
      if (!form.title.trim()) {
        setError('Title required');
        return false;
      }
      let report_data: unknown;
      let summary: unknown;
      let parameters: unknown;
      try {
        report_data = JSON.parse(form.reportDataText || '{}');
        summary = JSON.parse(form.summaryText || '{}');
        parameters = JSON.parse(form.parametersText || '{}');
      } catch {
        setError('Invalid JSON');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const templateId = form.templateId.trim()
          ? Number(form.templateId)
          : null;
        const payload: Record<string, unknown> = {
          school_id: schoolId,
          template_id: templateId,
          title: form.title.trim(),
          format: form.format || 'json',
          report_data,
          summary,
          parameters,
          file_url: form.fileUrl.trim() || undefined,
          generated_by: actorId,
        };
        if (editingId) {
          const { school_id: _s, generated_by: _g, ...upd } = payload;
          await reportSnapshotsApi.update(editingId, upd, schoolId);
        } else {
          await reportSnapshotsApi.create(payload);
        }
        setSnapshotPage(1);
        await loadSnapshots();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, actorId, loadSnapshots],
  );

  const removeSnapshot = useCallback(
    async (id: number) => {
      setBusy(true);
      setError(null);
      try {
        await reportSnapshotsApi.softDelete(id, schoolId);
        await loadSnapshots();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadSnapshots],
  );

  const saveWidget = useCallback(
    async (form: WidgetForm, editingId?: number) => {
      if (!form.title.trim()) {
        setError('Title required');
        return false;
      }
      let config: unknown;
      try {
        config = JSON.parse(form.configText || '{}');
      } catch {
        setError('Invalid JSON');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const payload: Record<string, unknown> = {
          school_id: schoolId,
          user_id: actorId,
          title: form.title.trim(),
          widget_type: form.widgetType || 'kpi',
          module: form.module.trim() || undefined,
          config,
          size: form.size || 'medium',
          position: Number(form.position) || 0,
        };
        if (editingId) {
          const { school_id: _s, user_id: _u, ...upd } = payload;
          await dashboardWidgetsApi.update(editingId, upd, schoolId);
        } else {
          await dashboardWidgetsApi.create(payload);
        }
        setWidgetPage(1);
        await loadWidgets();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, actorId, loadWidgets],
  );

  const removeWidget = useCallback(
    async (id: number) => {
      setBusy(true);
      setError(null);
      try {
        await dashboardWidgetsApi.softDelete(id, schoolId);
        await loadWidgets();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadWidgets],
  );

  const templatePages = useMemo(
    () => Math.max(1, Math.ceil(templateTotal / PER_PAGE)),
    [templateTotal],
  );
  const snapshotPages = useMemo(
    () => Math.max(1, Math.ceil(snapshotTotal / PER_PAGE)),
    [snapshotTotal],
  );
  const widgetPages = useMemo(
    () => Math.max(1, Math.ceil(widgetTotal / PER_PAGE)),
    [widgetTotal],
  );

  return {
    status,
    error,
    setError,
    busy,
    schoolId,
    templates,
    snapshots,
    widgets,
    templateTotal,
    snapshotTotal,
    widgetTotal,
    templatePage,
    snapshotPage,
    widgetPage,
    templatePages,
    snapshotPages,
    widgetPages,
    setTemplatePage,
    setSnapshotPage,
    setWidgetPage,
    typeFilter,
    formatFilter,
    widgetTypeFilter,
    setTypeFilter: setTypeFilterAndReset,
    setFormatFilter: setFormatFilterAndReset,
    setWidgetTypeFilter: setWidgetTypeFilterAndReset,
    saveTemplate,
    removeTemplate,
    saveSnapshot,
    removeSnapshot,
    saveWidget,
    removeWidget,
    reload: bootstrap,
  };
}
