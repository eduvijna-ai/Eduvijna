/**
 * Admin Form Builder — web FormBuilderTab school-wide parity.
 * Templates · Responses (CRUD + soft-deactivate).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { formTemplatesApi, formResponsesApi } from '@core/api/erp.api';
import { USE_MOCK_DATA } from '../config';
import {
  extractErrorMessage,
  pickNumber,
  pickString,
  safeList,
  type LoadStatus,
} from '../utils/apiHelpers';
import { useSchoolsSession } from './useSchoolsSession';

export type AdminFormsTab = 'templates' | 'responses';

export type FormTemplateRow = {
  id: number;
  schoolId: number;
  title: string;
  description: string;
  formType: string;
  fields: unknown;
  settings: unknown;
  status: string;
  startDate: string;
  endDate: string;
  responseCount: number;
  isActive: boolean;
};

export type FormResponseRow = {
  id: number;
  schoolId: number;
  formId: number;
  respondentId: number | null;
  answers: unknown;
  status: string;
  score: number | null;
  reviewerNotes: string;
  submittedAt: string;
  isActive: boolean;
};

export type TemplateForm = {
  title: string;
  description: string;
  formType: string;
  fieldsText: string;
  settingsText: string;
  status: string;
  startDate: string;
  endDate: string;
};

export type ResponseForm = {
  /** UI label "Template ID" — maps to API `form_id`. */
  templateId: string;
  respondentId: string;
  answersText: string;
  status: string;
  score: string;
  reviewerNotes: string;
};

const PER_PAGE = 25;

function mapTemplate(r: Record<string, unknown>): FormTemplateRow {
  return {
    id: pickNumber(r.id),
    schoolId: pickNumber(r.school_id),
    title: pickString(r.title),
    description: pickString(r.description),
    formType: pickString(r.form_type, 'survey').toLowerCase(),
    fields: r.fields ?? [],
    settings: r.settings ?? {},
    status: pickString(r.status, 'draft').toLowerCase(),
    startDate: pickString(r.start_date).slice(0, 10),
    endDate: pickString(r.end_date).slice(0, 10),
    responseCount: pickNumber(r.response_count),
    isActive: r.is_active !== false,
  };
}

function mapResponse(r: Record<string, unknown>): FormResponseRow {
  return {
    id: pickNumber(r.id),
    schoolId: pickNumber(r.school_id),
    formId: pickNumber(r.form_id),
    respondentId:
      r.respondent_id != null && r.respondent_id !== ''
        ? pickNumber(r.respondent_id)
        : null,
    answers: r.answers ?? {},
    status: pickString(r.status).toLowerCase(),
    score:
      r.score != null && r.score !== ''
        ? pickNumber(r.score)
        : null,
    reviewerNotes: pickString(r.reviewer_notes),
    submittedAt: pickString(r.submitted_at).slice(0, 10),
    isActive: r.is_active !== false,
  };
}

function totalFrom(raw: unknown, fallback: number): number {
  if (raw && typeof raw === 'object' && 'total' in (raw as object)) {
    return pickNumber((raw as Record<string, unknown>).total, fallback);
  }
  return fallback;
}

export function useAdminFormsData() {
  const { schoolId: sid } = useSchoolsSession();
  const schoolId = sid ?? undefined;

  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [templates, setTemplates] = useState<FormTemplateRow[]>([]);
  const [responses, setResponses] = useState<FormResponseRow[]>([]);

  const [templateTotal, setTemplateTotal] = useState(0);
  const [responseTotal, setResponseTotal] = useState(0);

  const [templatePage, setTemplatePage] = useState(1);
  const [responsePage, setResponsePage] = useState(1);

  const [typeFilter, setTypeFilter] = useState('');
  const [templateStatusFilter, setTemplateStatusFilter] = useState('');
  const [templateIdFilter, setTemplateIdFilter] = useState('');
  /** UI-only on web (not sent to list API) — keep same behavior. */
  const [responseStatusFilter, setResponseStatusFilter] = useState('');

  const loadTemplates = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await formTemplatesApi.list({
        form_type: typeFilter || undefined,
        status: templateStatusFilter || undefined,
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
  }, [schoolId, templatePage, typeFilter, templateStatusFilter]);

  const loadResponses = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await formResponsesApi.list({
        form_id: templateIdFilter.trim()
          ? Number(templateIdFilter)
          : undefined,
        page: responsePage,
        per_page: PER_PAGE,
        school_id: schoolId,
      });
      // Web keeps response statusFilter in fetch deps but does not send it to the API.
      const items = safeList<Record<string, unknown>>(raw).map(mapResponse);
      setResponses(items);
      setResponseTotal(totalFrom(raw, items.length));
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load responses'));
      setResponses([]);
      setResponseTotal(0);
    }
  }, [schoolId, responsePage, templateIdFilter, responseStatusFilter]);

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
    void loadResponses();
  }, [status, loadResponses]);

  const setTypeFilterAndReset = useCallback((v: string) => {
    setTypeFilter(v);
    setTemplatePage(1);
  }, []);

  const setTemplateStatusFilterAndReset = useCallback((v: string) => {
    setTemplateStatusFilter(v);
    setTemplatePage(1);
  }, []);

  const setTemplateIdFilterAndReset = useCallback((v: string) => {
    setTemplateIdFilter(v);
    setResponsePage(1);
  }, []);

  const setResponseStatusFilterAndReset = useCallback((v: string) => {
    setResponseStatusFilter(v);
    setResponsePage(1);
  }, []);

  const saveTemplate = useCallback(
    async (form: TemplateForm, editingId?: number) => {
      if (!form.title.trim()) {
        setError('Title required');
        return false;
      }
      let fields: unknown;
      let settings: unknown;
      try {
        fields = JSON.parse(form.fieldsText || '[]');
        settings = JSON.parse(form.settingsText || '{}');
      } catch {
        setError('Invalid JSON in fields/settings');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const payload: Record<string, unknown> = {
          school_id: schoolId,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          form_type: form.formType || 'survey',
          fields,
          settings,
          status: form.status || 'draft',
          start_date: form.startDate.trim() || undefined,
          end_date: form.endDate.trim() || undefined,
        };
        if (editingId) {
          const { school_id: _s, ...upd } = payload;
          await formTemplatesApi.update(editingId, upd, schoolId);
        } else {
          await formTemplatesApi.create(payload);
        }
        setTemplatePage(1);
        await loadTemplates();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save template failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadTemplates],
  );

  const removeTemplate = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await formTemplatesApi.softDelete(id, schoolId);
        await loadTemplates();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadTemplates],
  );

  const saveResponse = useCallback(
    async (form: ResponseForm, editingId?: number) => {
      if (!form.templateId.trim() || !form.respondentId.trim()) {
        setError('Template & respondent IDs required');
        return false;
      }
      let answers: unknown;
      try {
        answers = JSON.parse(form.answersText || '{}');
      } catch {
        setError('Invalid JSON in answers');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        if (editingId) {
          await formResponsesApi.update(
            editingId,
            {
              form_id: Number(form.templateId),
              respondent_id: Number(form.respondentId),
              answers,
              status: form.status || undefined,
              score: form.score.trim() ? Number(form.score) : null,
              reviewer_notes: form.reviewerNotes.trim() || undefined,
            },
            schoolId,
          );
        } else {
          // API expects form_id (web UI uses template_id label).
          await formResponsesApi.create({
            school_id: schoolId,
            form_id: Number(form.templateId),
            respondent_id: Number(form.respondentId),
            answers,
          });
        }
        setResponsePage(1);
        await loadResponses();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save response failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadResponses],
  );

  const removeResponse = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await formResponsesApi.softDelete(id, schoolId);
        await loadResponses();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadResponses],
  );

  const templatePages = Math.max(1, Math.ceil(templateTotal / PER_PAGE));
  const responsePages = Math.max(1, Math.ceil(responseTotal / PER_PAGE));

  return useMemo(
    () => ({
      status,
      error,
      busy,
      schoolId,
      templates,
      responses,
      templateTotal,
      responseTotal,
      templatePage,
      responsePage,
      templatePages,
      responsePages,
      typeFilter,
      templateStatusFilter,
      templateIdFilter,
      responseStatusFilter,
      setTemplatePage,
      setResponsePage,
      setTypeFilter: setTypeFilterAndReset,
      setTemplateStatusFilter: setTemplateStatusFilterAndReset,
      setTemplateIdFilter: setTemplateIdFilterAndReset,
      setResponseStatusFilter: setResponseStatusFilterAndReset,
      loadTemplates,
      loadResponses,
      saveTemplate,
      removeTemplate,
      saveResponse,
      removeResponse,
      refetch: bootstrap,
      clearError: () => setError(null),
    }),
    [
      status,
      error,
      busy,
      schoolId,
      templates,
      responses,
      templateTotal,
      responseTotal,
      templatePage,
      responsePage,
      templatePages,
      responsePages,
      typeFilter,
      templateStatusFilter,
      templateIdFilter,
      responseStatusFilter,
      setTypeFilterAndReset,
      setTemplateStatusFilterAndReset,
      setTemplateIdFilterAndReset,
      setResponseStatusFilterAndReset,
      loadTemplates,
      loadResponses,
      saveTemplate,
      removeTemplate,
      saveResponse,
      removeResponse,
      bootstrap,
    ],
  );
}
