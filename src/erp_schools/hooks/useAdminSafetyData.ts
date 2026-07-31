/**
 * Admin Safety & Security — web SafetySecurityTab + safety APIs parity.
 * Visitors (Safety tab) · Incidents · Emergency Contacts (same /api/v1/erp/safety/*).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  visitorsApi,
  incidentsApi,
  emergencyContactsApi,
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
import { useSchoolsSession } from './useSchoolsSession';

export const VISIT_PURPOSES = [
  'meeting',
  'delivery',
  'parent_visit',
  'official',
  'interview',
  'maintenance',
  'vendor',
  'general',
  'other',
] as const;

export const VISITOR_STATUSES = [
  'pre_registered',
  'checked_in',
  'checked_out',
  'denied',
  'cancelled',
] as const;

export const INCIDENT_TYPES = [
  'accident',
  'injury',
  'fight',
  'theft',
  'vandalism',
  'fire',
  'medical',
  'bullying',
  'trespassing',
  'general',
  'other',
] as const;

export const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

export const INCIDENT_STATUSES = [
  'reported',
  'investigating',
  'action_taken',
  'resolved',
  'closed',
  'escalated',
] as const;

export const CONTACT_TYPES = [
  'internal',
  'police',
  'fire',
  'ambulance',
  'hospital',
  'parent_helpline',
  'other',
] as const;

export type AdminSafetyTab = 'visitors' | 'incidents' | 'emergency';

export type VisitorRow = {
  id: number;
  visitorName: string;
  phone: string;
  email: string;
  purpose: string;
  visitingWhom: string;
  department: string;
  vehicleNumber: string;
  badgeNumber: string;
  status: string;
  remarks: string;
  isActive: boolean;
};

export type IncidentRow = {
  id: number;
  title: string;
  incidentType: string;
  severity: string;
  description: string;
  location: string;
  incidentDate: string;
  reportedBy: number | null;
  witnesses: string;
  involvedPersons: string;
  actionTaken: string;
  status: string;
  isActive: boolean;
};

export type EmergencyContactRow = {
  id: number;
  name: string;
  role: string;
  phone: string;
  alternatePhone: string;
  email: string;
  contactType: string;
  isPrimary: boolean;
  isActive: boolean;
};

export type VisitorForm = {
  visitorName: string;
  phone: string;
  email: string;
  purpose: string;
  visitingWhom: string;
  department: string;
  vehicleNumber: string;
  badgeNumber: string;
  status: string;
  remarks: string;
};

export type IncidentForm = {
  title: string;
  incidentType: string;
  severity: string;
  description: string;
  location: string;
  incidentDate: string;
  reportedBy: string;
  witnesses: string;
  involvedPersons: string;
  actionTaken: string;
  status: string;
};

export type EmergencyContactForm = {
  name: string;
  role: string;
  phone: string;
  alternatePhone: string;
  email: string;
  contactType: string;
  isPrimary: boolean;
};

const PER_PAGE = 25;

function labelize(s: string) {
  return s.replace(/_/g, ' ');
}

function mapVisitor(r: Record<string, unknown>): VisitorRow {
  return {
    id: pickNumber(r.id),
    visitorName: pickString(r.visitor_name),
    phone: pickString(r.phone),
    email: pickString(r.email),
    purpose: pickString(r.purpose, 'general').toLowerCase(),
    visitingWhom: pickString(r.visiting_whom),
    department: pickString(r.department),
    vehicleNumber: pickString(r.vehicle_number),
    badgeNumber: pickString(r.badge_number),
    status: pickString(r.status, 'checked_in').toLowerCase(),
    remarks: pickString(r.remarks),
    isActive: r.is_active !== false,
  };
}

function mapIncident(r: Record<string, unknown>): IncidentRow {
  return {
    id: pickNumber(r.id),
    title: pickString(r.title),
    incidentType: pickString(r.incident_type, 'general').toLowerCase(),
    severity: pickString(r.severity, 'medium').toLowerCase(),
    description: pickString(r.description),
    location: pickString(r.location),
    incidentDate: pickString(r.incident_date).slice(0, 10),
    reportedBy: r.reported_by != null && r.reported_by !== '' ? pickNumber(r.reported_by) : null,
    witnesses: pickString(r.witnesses),
    involvedPersons: pickString(r.involved_persons),
    actionTaken: pickString(r.action_taken),
    status: pickString(r.status, 'reported').toLowerCase(),
    isActive: r.is_active !== false,
  };
}

function mapContact(r: Record<string, unknown>): EmergencyContactRow {
  return {
    id: pickNumber(r.id),
    name: pickString(r.name),
    role: pickString(r.role),
    phone: pickString(r.phone),
    alternatePhone: pickString(r.alternate_phone),
    email: pickString(r.email),
    contactType: pickString(r.contact_type, 'internal').toLowerCase(),
    isPrimary: Boolean(r.is_primary),
    isActive: r.is_active !== false,
  };
}

function totalFrom(raw: unknown, fallback: number) {
  if (raw && typeof raw === 'object' && 'total' in (raw as object)) {
    return pickNumber((raw as Record<string, unknown>).total, fallback);
  }
  return fallback;
}

export function useAdminSafetyData() {
  const { schoolId: sid } = useSchoolsSession();
  const schoolId = sid ?? undefined;

  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [contacts, setContacts] = useState<EmergencyContactRow[]>([]);

  const [visitorTotal, setVisitorTotal] = useState(0);
  const [incidentTotal, setIncidentTotal] = useState(0);
  const [contactTotal, setContactTotal] = useState(0);

  const [visitorPage, setVisitorPage] = useState(1);
  const [incidentPage, setIncidentPage] = useState(1);
  const [contactPage, setContactPage] = useState(1);

  const [purposeFilter, setPurposeFilter] = useState('');
  const [visitorStatusFilter, setVisitorStatusFilter] = useState('');
  const [incidentTypeFilter, setIncidentTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [contactTypeFilter, setContactTypeFilter] = useState('');

  const loadVisitors = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const params: Record<string, unknown> = {
        page: visitorPage,
        per_page: PER_PAGE,
        school_id: schoolId,
      };
      if (purposeFilter) params.purpose = purposeFilter;
      if (visitorStatusFilter === 'deactivated') {
        params.is_active = false;
      } else if (visitorStatusFilter) {
        params.status = visitorStatusFilter;
      }
      const raw = await visitorsApi.list(params);
      const items = safeList<Record<string, unknown>>(raw).map(mapVisitor);
      setVisitors(items);
      setVisitorTotal(totalFrom(raw, items.length));
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load visitors'));
      setVisitors([]);
      setVisitorTotal(0);
    }
  }, [schoolId, visitorPage, purposeFilter, visitorStatusFilter]);

  const loadIncidents = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await incidentsApi.list({
        incident_type: incidentTypeFilter || undefined,
        severity: severityFilter || undefined,
        page: incidentPage,
        per_page: PER_PAGE,
        school_id: schoolId,
      });
      const items = safeList<Record<string, unknown>>(raw).map(mapIncident);
      setIncidents(items);
      setIncidentTotal(totalFrom(raw, items.length));
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load incidents'));
      setIncidents([]);
      setIncidentTotal(0);
    }
  }, [schoolId, incidentPage, incidentTypeFilter, severityFilter]);

  const loadContacts = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await emergencyContactsApi.list({
        contact_type: contactTypeFilter || undefined,
        page: contactPage,
        per_page: PER_PAGE,
        school_id: schoolId,
      });
      const items = safeList<Record<string, unknown>>(raw).map(mapContact);
      setContacts(items);
      setContactTotal(totalFrom(raw, items.length));
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load emergency contacts'));
      setContacts([]);
      setContactTotal(0);
    }
  }, [schoolId, contactPage, contactTypeFilter]);

  const refetch = useCallback(async () => {
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
      await Promise.all([loadVisitors(), loadIncidents(), loadContacts()]);
      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e));
      setStatus('error');
    }
  }, [schoolId, loadVisitors, loadIncidents, loadContacts]);

  useEffect(() => {
    if (USE_MOCK_DATA) {
      setStatus('ready');
      return;
    }
    if (!schoolId) return;
    let cancelled = false;
    (async () => {
      setStatus('loading');
      setError(null);
      try {
        await Promise.all([loadVisitors(), loadIncidents(), loadContacts()]);
        if (!cancelled) setStatus('ready');
      } catch (e) {
        if (!cancelled) {
          setError(extractErrorMessage(e));
          setStatus('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  useEffect(() => {
    if (status !== 'ready' || USE_MOCK_DATA || !schoolId) return;
    void loadVisitors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitorPage, purposeFilter, visitorStatusFilter]);

  useEffect(() => {
    if (status !== 'ready' || USE_MOCK_DATA || !schoolId) return;
    void loadIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentPage, incidentTypeFilter, severityFilter]);

  useEffect(() => {
    if (status !== 'ready' || USE_MOCK_DATA || !schoolId) return;
    void loadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactPage, contactTypeFilter]);

  const setPurpose = useCallback((v: string) => {
    setPurposeFilter(v);
    setVisitorPage(1);
  }, []);

  const setVisitorStatus = useCallback((v: string) => {
    setVisitorStatusFilter(v);
    setVisitorPage(1);
  }, []);

  const setIncidentType = useCallback((v: string) => {
    setIncidentTypeFilter(v);
    setIncidentPage(1);
  }, []);

  const setSeverity = useCallback((v: string) => {
    setSeverityFilter(v);
    setIncidentPage(1);
  }, []);

  const setContactType = useCallback((v: string) => {
    setContactTypeFilter(v);
    setContactPage(1);
  }, []);

  const saveVisitor = useCallback(
    async (form: VisitorForm, editingId?: number) => {
      if (!form.visitorName.trim()) {
        setError('Name is required');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const payload = {
          school_id: schoolId,
          visitor_name: form.visitorName.trim(),
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          purpose: form.purpose || 'general',
          visiting_whom: form.visitingWhom.trim() || undefined,
          department: form.department.trim() || undefined,
          vehicle_number: form.vehicleNumber.trim() || undefined,
          badge_number: form.badgeNumber.trim() || undefined,
          status: form.status || 'checked_in',
          remarks: form.remarks.trim() || undefined,
        };
        if (editingId) {
          const { school_id: _s, ...upd } = payload;
          await visitorsApi.update(editingId, upd, schoolId);
        } else {
          await visitorsApi.create(payload);
        }
        setVisitorPage(1);
        await loadVisitors();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save visitor failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadVisitors],
  );

  const removeVisitor = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await visitorsApi.softDelete(id, schoolId);
        await loadVisitors();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadVisitors],
  );

  const saveIncident = useCallback(
    async (form: IncidentForm, editingId?: number) => {
      if (!form.title.trim()) {
        setError('Title is required');
        return false;
      }
      if (!form.description.trim()) {
        setError('Description is required');
        return false;
      }
      if (!form.incidentDate.trim()) {
        setError('Incident date is required');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const payload: Record<string, unknown> = {
          school_id: schoolId,
          title: form.title.trim(),
          incident_type: form.incidentType || 'general',
          severity: form.severity || 'medium',
          description: form.description.trim(),
          location: form.location.trim() || undefined,
          incident_date: form.incidentDate,
          reported_by: form.reportedBy.trim()
            ? Number(form.reportedBy)
            : undefined,
          witnesses: form.witnesses.trim() || undefined,
          involved_persons: form.involvedPersons.trim() || undefined,
          action_taken: form.actionTaken.trim() || undefined,
          status: form.status || 'reported',
        };
        if (editingId) {
          const { school_id: _s, ...upd } = payload;
          await incidentsApi.update(editingId, upd, schoolId);
        } else {
          await incidentsApi.create(payload);
        }
        setIncidentPage(1);
        await loadIncidents();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save incident failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadIncidents],
  );

  const removeIncident = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await incidentsApi.softDelete(id, schoolId);
        await loadIncidents();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadIncidents],
  );

  const saveContact = useCallback(
    async (form: EmergencyContactForm, editingId?: number) => {
      if (!form.name.trim()) {
        setError('Name is required');
        return false;
      }
      if (!form.phone.trim()) {
        setError('Phone is required');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const payload = {
          school_id: schoolId,
          name: form.name.trim(),
          role: form.role.trim() || undefined,
          phone: form.phone.trim(),
          alternate_phone: form.alternatePhone.trim() || undefined,
          email: form.email.trim() || undefined,
          contact_type: form.contactType || 'internal',
          is_primary: form.isPrimary,
        };
        if (editingId) {
          const { school_id: _s, ...upd } = payload;
          await emergencyContactsApi.update(editingId, upd, schoolId);
        } else {
          await emergencyContactsApi.create(payload);
        }
        setContactPage(1);
        await loadContacts();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save contact failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadContacts],
  );

  const removeContact = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await emergencyContactsApi.softDelete(id, schoolId);
        await loadContacts();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadContacts],
  );

  return useMemo(
    () => ({
      status,
      error,
      busy,
      visitors,
      incidents,
      contacts,
      visitorTotal,
      incidentTotal,
      contactTotal,
      visitorPage,
      incidentPage,
      contactPage,
      visitorPages: Math.max(1, Math.ceil(visitorTotal / PER_PAGE)),
      incidentPages: Math.max(1, Math.ceil(incidentTotal / PER_PAGE)),
      contactPages: Math.max(1, Math.ceil(contactTotal / PER_PAGE)),
      purposeFilter,
      visitorStatusFilter,
      incidentTypeFilter,
      severityFilter,
      contactTypeFilter,
      setPurpose,
      setVisitorStatus,
      setIncidentType,
      setSeverity,
      setContactType,
      setVisitorPage,
      setIncidentPage,
      setContactPage,
      loadVisitors,
      loadIncidents,
      loadContacts,
      saveVisitor,
      removeVisitor,
      saveIncident,
      removeIncident,
      saveContact,
      removeContact,
      refetch,
      labelize,
      today: toLocalDateStr,
    }),
    [
      status,
      error,
      busy,
      visitors,
      incidents,
      contacts,
      visitorTotal,
      incidentTotal,
      contactTotal,
      visitorPage,
      incidentPage,
      contactPage,
      purposeFilter,
      visitorStatusFilter,
      incidentTypeFilter,
      severityFilter,
      contactTypeFilter,
      setPurpose,
      setVisitorStatus,
      setIncidentType,
      setSeverity,
      setContactType,
      loadVisitors,
      loadIncidents,
      loadContacts,
      saveVisitor,
      removeVisitor,
      saveIncident,
      removeIncident,
      saveContact,
      removeContact,
      refetch,
    ],
  );
}
