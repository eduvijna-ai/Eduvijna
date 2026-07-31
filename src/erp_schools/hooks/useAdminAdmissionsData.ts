/**
 * Admin Admissions Operations Desk — web AdmissionsTab parity.
 * Enquiries · Visitor Register · Front Office · Incidents · Emergency Contacts.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  admissionsApi,
  visitorsApi,
  incidentsApi,
  emergencyContactsApi,
  phoneCallLogsApi,
  postalDispatchApi,
  postalReceiveApi,
  academicClassesApi,
  staffProfilesApi,
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
  ADMISSION_PIPELINE_STAGES,
  ADMISSION_STATUSES,
  CALL_TYPES,
  CONTACT_TYPES,
  GENDER_OPTIONS,
  INCIDENT_STATUSES,
  INCIDENT_TYPES,
  REFERENCE_OPTIONS,
  SEVERITIES,
  SOURCE_OPTIONS,
  VISITOR_FORM_STATUSES,
  VISITOR_ID_TYPES,
  VISITOR_PURPOSE_OPTIONS,
  enumLabel,
  pipelineStageCount,
  pipelineStageForStatus,
  resolvePipelineListStatus,
} from '../utils/admissionsMeta';
import { isValidApaarId, normalizeApaarId } from '../utils/apaarId';
import { useSchoolsSession } from './useSchoolsSession';

export type AdminAdmissionsTab =
  | 'enquiries'
  | 'visitor-register'
  | 'front-office'
  | 'incidents'
  | 'emergency';

export type ClassOption = { id: number; name: string };
export type StaffLookup = { id: number; userId: number; label: string };

export type EnquiryRow = {
  id: number;
  applicantName: string;
  applyingForClass: number | null;
  className: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  apaarId: string;
  dateOfBirth: string;
  gender: string;
  applicationDate: string;
  nextFollowUpDate: string;
  source: string;
  reference: string;
  status: string;
  assignedTo: number | null;
  assignedName: string;
  address: string;
  previousSchool: string;
  numberOfChild: number | null;
  remarks: string;
  isActive: boolean;
};

export type VisitorRow = {
  id: number;
  visitorName: string;
  phone: string;
  purpose: string;
  visitingWhom: string;
  idType: string;
  idNumber: string;
  visitDate: string;
  numberOfPerson: number;
  inTime: string;
  outTime: string;
  checkIn: string;
  checkOut: string;
  photoUrl: string;
  attachmentName: string;
  status: string;
  note: string;
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

export type PhoneCallRow = {
  id: number;
  name: string;
  phone: string;
  date: string;
  description: string;
  nextFollowUpDate: string;
  callDuration: string;
  note: string;
  callType: string;
  isActive: boolean;
};

export type PostalDispatchRow = {
  id: number;
  toTitle: string;
  referenceNo: string;
  address: string;
  note: string;
  fromTitle: string;
  date: string;
  attachmentName: string;
  isActive: boolean;
};

export type PostalReceiveRow = {
  id: number;
  fromTitle: string;
  referenceNo: string;
  address: string;
  note: string;
  toTitle: string;
  date: string;
  attachmentName: string;
  isActive: boolean;
};

export type EnquiryForm = {
  applicantName: string;
  applyingForClass: string;
  assignedTo: string;
  assignedName: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  apaarId: string;
  dateOfBirth: string;
  gender: string;
  applicationDate: string;
  nextFollowUpDate: string;
  source: string;
  reference: string;
  status: string;
  address: string;
  previousSchool: string;
  numberOfChild: string;
  remarks: string;
};

export type VisitorForm = {
  visitorName: string;
  phone: string;
  purpose: string;
  visitingWhom: string;
  idType: string;
  idNumber: string;
  visitDate: string;
  numberOfPerson: number;
  inTime: string;
  outTime: string;
  photoUrl: string;
  attachmentName: string;
  status: string;
  note: string;
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

export type PhoneCallForm = {
  name: string;
  phone: string;
  date: string;
  description: string;
  nextFollowUpDate: string;
  callDuration: string;
  note: string;
  callType: string;
};

export type PostalDispatchForm = {
  toTitle: string;
  referenceNo: string;
  address: string;
  note: string;
  fromTitle: string;
  date: string;
  attachmentName: string;
};

export type PostalReceiveForm = {
  fromTitle: string;
  referenceNo: string;
  address: string;
  note: string;
  toTitle: string;
  date: string;
  attachmentName: string;
};

type VisitorMeta = {
  visitDate?: string;
  numberOfPerson?: number;
  attachmentName?: string;
};

const PER_PAGE = 25;
const FRONT_OFFICE_PER_PAGE = 200;
const VISITOR_META_PREFIX = '__EDUVIJNA_VISITOR_META__=';

export {
  ADMISSION_PIPELINE_STAGES,
  ADMISSION_STATUSES,
  CALL_TYPES,
  CONTACT_TYPES,
  GENDER_OPTIONS,
  INCIDENT_STATUSES,
  INCIDENT_TYPES,
  REFERENCE_OPTIONS,
  SEVERITIES,
  SOURCE_OPTIONS,
  VISITOR_FORM_STATUSES,
  VISITOR_ID_TYPES,
  VISITOR_PURPOSE_OPTIONS,
  enumLabel,
  pipelineStageCount,
  pipelineStageForStatus,
  resolvePipelineListStatus,
};

function unwrapList(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  return safeList(data);
}

function totalFrom(raw: unknown, fallback: number): number {
  if (raw && typeof raw === 'object' && 'total' in (raw as object)) {
    return pickNumber((raw as Record<string, unknown>).total, fallback);
  }
  return fallback;
}

function normalizeStatusCounts(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  const source =
    obj.counts && typeof obj.counts === 'object'
      ? (obj.counts as Record<string, unknown>)
      : obj;
  const out: Record<string, number> = {};
  for (const [key, val] of Object.entries(source)) {
    if (key === 'items' || key === 'total' || key === 'data') continue;
    const n = Number(val);
    if (Number.isFinite(n)) out[key] = n;
  }
  return out;
}

function toDateInput(value?: string, fallback = ''): string {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString().slice(0, 10);
}

function toTimeInput(value?: string): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function combineDateAndTime(date: string, time: string): string | undefined {
  if (!date || !time) return undefined;
  return new Date(`${date}T${time}:00`).toISOString();
}

function buildVisitorRemarks(note: string, meta: VisitorMeta): string {
  const normalizedMeta = Object.fromEntries(
    Object.entries(meta).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );
  const metaLine = `${VISITOR_META_PREFIX}${JSON.stringify(normalizedMeta)}`;
  const trimmedNote = note.trim();
  return trimmedNote ? `${metaLine}\n${trimmedNote}` : metaLine;
}

function parseVisitorRemarks(remarks?: string): { note: string; meta: VisitorMeta } {
  if (!remarks) return { note: '', meta: {} };
  if (!remarks.startsWith(VISITOR_META_PREFIX)) return { note: remarks, meta: {} };
  const [metaLine, ...rest] = remarks.split('\n');
  try {
    return {
      note: rest.join('\n').trim(),
      meta: JSON.parse(metaLine.slice(VISITOR_META_PREFIX.length)) as VisitorMeta,
    };
  } catch {
    return { note: remarks, meta: {} };
  }
}

function formatStaffLabel(r: Record<string, unknown>): string {
  const name =
    [pickString(r.first_name), pickString(r.last_name)].filter(Boolean).join(' ').trim() ||
    'Unnamed Staff';
  const employeeCode = pickString(r.employee_code);
  const designation = pickString(r.designation);
  const suffix = employeeCode
    ? ` (${employeeCode})`
    : designation
      ? ` (${designation})`
      : '';
  return `${name}${suffix}`;
}

function mapClassOption(r: Record<string, unknown>): ClassOption | null {
  const id = pickNumber(r.class_id, pickNumber(r.id));
  if (!id) return null;
  return {
    id,
    name: pickString(r.class_name, r.name, `Class ${id}`),
  };
}

function mapStaffLookup(r: Record<string, unknown>): StaffLookup | null {
  const id = pickNumber(r.id);
  if (!id) return null;
  const userId = pickNumber(r.user_id, id);
  return { id, userId, label: formatStaffLabel(r) };
}

function mapEnquiry(
  r: Record<string, unknown>,
  classesById: Map<number, ClassOption>,
): EnquiryRow {
  const applyingForClass =
    r.applying_for_class != null && r.applying_for_class !== ''
      ? pickNumber(r.applying_for_class)
      : null;
  const cls = applyingForClass != null ? classesById.get(applyingForClass) : undefined;
  return {
    id: pickNumber(r.id),
    applicantName: pickString(r.applicant_name),
    applyingForClass,
    className:
      pickString(r.class_name) ||
      (cls ? cls.name : applyingForClass != null ? String(applyingForClass) : ''),
    parentName: pickString(r.parent_name),
    parentPhone: pickString(r.parent_phone),
    parentEmail: pickString(r.parent_email),
    apaarId: pickString(r.apaar_id),
    dateOfBirth: pickString(r.date_of_birth).slice(0, 10),
    gender: pickString(r.gender).toLowerCase(),
    applicationDate: pickString(r.application_date).slice(0, 10),
    nextFollowUpDate: pickString(r.next_follow_up_date).slice(0, 10),
    source: pickString(r.source),
    reference: pickString(r.reference),
    status: pickString(r.status, 'enquiry').toLowerCase(),
    assignedTo:
      r.assigned_to != null && r.assigned_to !== '' ? pickNumber(r.assigned_to) : null,
    assignedName: pickString(r.assigned_name),
    address: pickString(r.address),
    previousSchool: pickString(r.previous_school),
    numberOfChild:
      r.number_of_child != null && r.number_of_child !== ''
        ? pickNumber(r.number_of_child)
        : null,
    remarks: pickString(r.remarks),
    isActive: r.is_active !== false,
  };
}

function mapVisitor(r: Record<string, unknown>): VisitorRow {
  const parsed = parseVisitorRemarks(pickString(r.remarks));
  const checkIn = pickString(r.check_in);
  const checkOut = pickString(r.check_out);
  return {
    id: pickNumber(r.id),
    visitorName: pickString(r.visitor_name),
    phone: pickString(r.phone),
    purpose: pickString(r.purpose, 'meeting').toLowerCase(),
    visitingWhom: pickString(r.visiting_whom),
    idType: pickString(r.id_type, 'other').toLowerCase(),
    idNumber: pickString(r.id_number),
    visitDate: parsed.meta.visitDate || toDateInput(checkIn),
    numberOfPerson: pickNumber(parsed.meta.numberOfPerson, 1),
    inTime: toTimeInput(checkIn),
    outTime: toTimeInput(checkOut),
    checkIn,
    checkOut,
    photoUrl: pickString(r.photo_url),
    attachmentName:
      parsed.meta.attachmentName ||
      pickString(r.photo_url).split('/').pop() ||
      '',
    status: pickString(r.status, checkOut ? 'checked_out' : 'checked_in').toLowerCase(),
    note: parsed.note,
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
    reportedBy:
      r.reported_by != null && r.reported_by !== '' ? pickNumber(r.reported_by) : null,
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

function mapPhoneCall(r: Record<string, unknown>): PhoneCallRow {
  return {
    id: pickNumber(r.id),
    name: pickString(r.name),
    phone: pickString(r.phone),
    date: pickString(r.date).slice(0, 10),
    description: pickString(r.description),
    nextFollowUpDate: pickString(r.next_follow_up_date).slice(0, 10),
    callDuration: pickString(r.call_duration),
    note: pickString(r.note),
    callType: pickString(r.call_type, 'incoming').toLowerCase(),
    isActive: r.is_active !== false,
  };
}

function mapPostalDispatch(r: Record<string, unknown>): PostalDispatchRow {
  return {
    id: pickNumber(r.id),
    toTitle: pickString(r.to_title),
    referenceNo: pickString(r.reference_no),
    address: pickString(r.address),
    note: pickString(r.note),
    fromTitle: pickString(r.from_title),
    date: pickString(r.date).slice(0, 10),
    attachmentName: pickString(r.attachment_name),
    isActive: r.is_active !== false,
  };
}

function mapPostalReceive(r: Record<string, unknown>): PostalReceiveRow {
  return {
    id: pickNumber(r.id),
    fromTitle: pickString(r.from_title),
    referenceNo: pickString(r.reference_no),
    address: pickString(r.address),
    note: pickString(r.note),
    toTitle: pickString(r.to_title),
    date: pickString(r.date).slice(0, 10),
    attachmentName: pickString(r.attachment_name),
    isActive: r.is_active !== false,
  };
}

export function useAdminAdmissionsData() {
  const { schoolId: sid } = useSchoolsSession();
  const schoolId = sid ?? undefined;

  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [staff, setStaff] = useState<StaffLookup[]>([]);

  const [enquiries, setEnquiries] = useState<EnquiryRow[]>([]);
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [contacts, setContacts] = useState<EmergencyContactRow[]>([]);
  const [phoneCalls, setPhoneCalls] = useState<PhoneCallRow[]>([]);
  const [postalDispatch, setPostalDispatch] = useState<PostalDispatchRow[]>([]);
  const [postalReceive, setPostalReceive] = useState<PostalReceiveRow[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const statusCountsRef = useRef<Record<string, number>>({});
  const [dueTodayCount, setDueTodayCount] = useState(0);
  const [boardEnquiries, setBoardEnquiries] = useState<EnquiryRow[]>([]);

  const [enquiryTotal, setEnquiryTotal] = useState(0);
  const [visitorTotal, setVisitorTotal] = useState(0);
  const [incidentTotal, setIncidentTotal] = useState(0);
  const [contactTotal, setContactTotal] = useState(0);

  const [enquiryPage, setEnquiryPage] = useState(1);
  const [visitorPage, setVisitorPage] = useState(1);
  const [incidentPage, setIncidentPage] = useState(1);
  const [contactPage, setContactPage] = useState(1);

  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [searchSource, setSearchSource] = useState('');
  const [searchClass, setSearchClass] = useState('');
  /** Pipeline stage key (e.. `new`), not raw API status. */
  const [statusFilter, setStatusFilter] = useState<string>(ADMISSION_PIPELINE_STAGES[0].key);

  const [visitorSearch, setVisitorSearch] = useState('');
  const [purposeFilter, setPurposeFilter] = useState('');
  const [visitorStatusFilter, setVisitorStatusFilter] = useState('');

  const [incidentTypeFilter, setIncidentTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [contactTypeFilter, setContactTypeFilter] = useState('');

  const [frontOfficeQuery, setFrontOfficeQuery] = useState('');

  const classesById = useMemo(
    () => new Map(classes.map((c) => [c.id, c])),
    [classes],
  );

  const loadLookups = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) {
      setClasses([]);
      setStaff([]);
      return;
    }
    try {
      const [clsRaw, staffRaw] = await Promise.all([
        academicClassesApi.list(schoolId),
        staffProfilesApi.list({ school_id: schoolId, per_page: 200 }),
      ]);
      setClasses(
        unwrapList(clsRaw)
          .map(mapClassOption)
          .filter((c): c is ClassOption => c != null)
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
      );
      setStaff(
        safeList<Record<string, unknown>>(staffRaw)
          .map(mapStaffLookup)
          .filter((s): s is StaffLookup => s != null),
      );
    } catch {
      setClasses([]);
      setStaff([]);
    }
  }, [schoolId]);

  const loadStatusCounts = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) {
      setStatusCounts({});
      statusCountsRef.current = {};
      setDueTodayCount(0);
      setBoardEnquiries([]);
      return;
    }
    try {
      const [countsRaw, boardRaw] = await Promise.all([
        admissionsApi.statusCounts({ school_id: schoolId }),
        admissionsApi.list({
          school_id: schoolId,
          page: 1,
          per_page: 200,
          is_active: true,
        }),
      ]);
      setStatusCounts(normalizeStatusCounts(countsRaw));
      statusCountsRef.current = normalizeStatusCounts(countsRaw);
      const boardItems = safeList<Record<string, unknown>>(boardRaw)
        .map((r) => mapEnquiry(r, new Map()))
        .filter((row) => row.isActive);
      setBoardEnquiries(boardItems);
      const today = toLocalDateStr();
      setDueTodayCount(
        boardItems.filter((row) => row.nextFollowUpDate === today && row.isActive).length,
      );
    } catch {
      setStatusCounts({});
      statusCountsRef.current = {};
      setDueTodayCount(0);
      setBoardEnquiries([]);
    }
  }, [schoolId]);

  const loadEnquiries = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const params: Record<string, unknown> = {
        page: enquiryPage,
        per_page: PER_PAGE,
        school_id: schoolId,
        // Web pipeline hides soft-deleted / deactivated leads (e.g. __diag_test_*).
        is_active: true,
      };
      if (searchName.trim()) params.q = searchName.trim();
      if (statusFilter) {
        // Resolve stage key → API status that actually holds the rows (e.g. new→enquiry).
        params.status = resolvePipelineListStatus(statusFilter, statusCountsRef.current);
      }
      if (searchClass) params.applying_for_class = Number(searchClass);
      const raw = await admissionsApi.list(params);
      // Avoid classesById in deps — that Map changes after loadLookups and would
      // recreate loadEnquiries → recreate bootstrap → infinite loading spinner.
      const mapped = safeList<Record<string, unknown>>(raw).map((r) =>
        mapEnquiry(r, new Map()),
      );
      // Client filter in case API still returns deactivated rows.
      const items = mapped.filter((row) => row.isActive);
      setEnquiries(items);
      const apiTotal = totalFrom(raw, mapped.length);
      const dropped = mapped.length - items.length;
      setEnquiryTotal(Math.max(items.length, apiTotal - dropped));
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load enquiries'));
      setEnquiries([]);
      setEnquiryTotal(0);
    }
  }, [schoolId, enquiryPage, searchName, searchClass, statusFilter]);

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
        params.status = 'deactivated';
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

  const loadFrontOffice = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const q = frontOfficeQuery.trim() || undefined;
      const base = {
        school_id: schoolId,
        q,
        page: 1,
        per_page: FRONT_OFFICE_PER_PAGE,
      };
      const [callsRaw, dispatchRaw, receiveRaw] = await Promise.all([
        phoneCallLogsApi.list(base),
        postalDispatchApi.list(base),
        postalReceiveApi.list(base),
      ]);
      setPhoneCalls(safeList<Record<string, unknown>>(callsRaw).map(mapPhoneCall));
      setPostalDispatch(safeList<Record<string, unknown>>(dispatchRaw).map(mapPostalDispatch));
      setPostalReceive(safeList<Record<string, unknown>>(receiveRaw).map(mapPostalReceive));
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load front office records'));
      setPhoneCalls([]);
      setPostalDispatch([]);
      setPostalReceive([]);
    }
  }, [schoolId, frontOfficeQuery]);

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
      await Promise.all([
        loadLookups(),
        loadStatusCounts(),
        loadVisitors(),
        loadIncidents(),
        loadContacts(),
        loadFrontOffice(),
      ]);
      // After counts so New→enquiry resolve sees live status-counts (e.g. vivaan).
      await loadEnquiries();
      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e));
      setStatus('error');
    }
    // Intentionally only schoolId — filter/page reloads use dedicated effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status !== 'ready' || USE_MOCK_DATA || !schoolId) return;
    void loadEnquiries();
  }, [status, loadEnquiries]);

  useEffect(() => {
    if (status !== 'ready' || USE_MOCK_DATA || !schoolId) return;
    void loadStatusCounts();
  }, [status, loadStatusCounts]);

  useEffect(() => {
    if (status !== 'ready' || USE_MOCK_DATA || !schoolId) return;
    void loadVisitors();
  }, [status, loadVisitors]);

  useEffect(() => {
    if (status !== 'ready' || USE_MOCK_DATA || !schoolId) return;
    void loadIncidents();
  }, [status, loadIncidents]);

  useEffect(() => {
    if (status !== 'ready' || USE_MOCK_DATA || !schoolId) return;
    void loadContacts();
  }, [status, loadContacts]);

  useEffect(() => {
    if (status !== 'ready' || USE_MOCK_DATA || !schoolId) return;
    void loadFrontOffice();
  }, [status, loadFrontOffice]);

  useEffect(() => {
    if (status !== 'ready' || USE_MOCK_DATA || !schoolId) return;
    void loadLookups();
  }, [status, loadLookups]);

  const filteredEnquiries = useMemo(() => {
    let rows = enquiries
      .filter((row) => row.isActive)
      .map((row) => {
        if (!row.applyingForClass) return row;
        const cls = classesById.get(row.applyingForClass);
        if (!cls || row.className === cls.name) return row;
        return { ...row, className: cls.name };
      });
    if (searchPhone.trim()) {
      const q = searchPhone.trim();
      rows = rows.filter((row) => row.parentPhone.includes(q));
    }
    if (searchSource) {
      rows = rows.filter((row) => row.source === searchSource);
    }
    return rows;
  }, [enquiries, searchPhone, searchSource, classesById]);

  const enrichedBoardEnquiries = useMemo(() => {
    let rows = boardEnquiries
      .filter((row) => row.isActive)
      .map((row) => {
        if (!row.applyingForClass) return row;
        const cls = classesById.get(row.applyingForClass);
        if (!cls || row.className === cls.name) return row;
        return { ...row, className: cls.name };
      });
    if (searchName.trim()) {
      const q = searchName.trim().toLowerCase();
      rows = rows.filter(
        (row) =>
          row.applicantName.toLowerCase().includes(q) ||
          row.parentPhone.includes(q) ||
          String(row.id).includes(q),
      );
    }
    if (searchPhone.trim()) {
      const q = searchPhone.trim();
      rows = rows.filter((row) => row.parentPhone.includes(q));
    }
    if (searchSource) {
      rows = rows.filter((row) => row.source === searchSource);
    }
    if (searchClass) {
      const classId = Number(searchClass);
      rows = rows.filter((row) => row.applyingForClass === classId);
    }
    return rows;
  }, [boardEnquiries, classesById, searchName, searchPhone, searchSource, searchClass]);

  const pipelineStageCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const stage of ADMISSION_PIPELINE_STAGES) {
      out[stage.key] = pipelineStageCount(statusCounts, stage);
    }
    return out;
  }, [statusCounts]);

  const pipelineKpis = useMemo(
    () => ({
      newCount: pipelineStageCounts.new ?? 0,
      dueToday: dueTodayCount,
      enrolled: pipelineStageCounts.enrolled ?? 0,
    }),
    [pipelineStageCounts, dueTodayCount],
  );

  const activePipelineStage = useMemo(() => {
    return (
      ADMISSION_PIPELINE_STAGES.find((s) => s.key === statusFilter) ??
      ADMISSION_PIPELINE_STAGES[0]
    );
  }, [statusFilter]);

  const activePipelineStep = useMemo(() => {
    const idx = ADMISSION_PIPELINE_STAGES.findIndex((s) => s.key === statusFilter);
    return idx >= 0 ? idx + 1 : 1;
  }, [statusFilter]);

  const filteredVisitors = useMemo(() => {
    const q = visitorSearch.trim().toLowerCase();
    if (!q) return visitors;
    return visitors.filter((row) =>
      [row.visitorName, row.phone, row.visitingWhom, row.idNumber, row.attachmentName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [visitors, visitorSearch]);

  const visitorStats = useMemo(() => {
    const currentDate = toLocalDateStr();
    return {
      total: filteredVisitors.length,
      checkedIn: filteredVisitors.filter(
        (row) => row.status === 'checked_in' && !row.checkOut,
      ).length,
      checkedOut: filteredVisitors.filter(
        (row) => row.status === 'checked_out' || !!row.checkOut,
      ).length,
      today: filteredVisitors.filter((row) => {
        const visitDate = row.visitDate || toDateInput(row.checkIn, '');
        return visitDate === currentDate;
      }).length,
    };
  }, [filteredVisitors]);

  const enquiryPages = Math.max(1, Math.ceil(enquiryTotal / PER_PAGE));
  const visitorPages = Math.max(1, Math.ceil(visitorTotal / PER_PAGE));
  const incidentPages = Math.max(1, Math.ceil(incidentTotal / PER_PAGE));
  const contactPages = Math.max(1, Math.ceil(contactTotal / PER_PAGE));

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

  const saveEnquiry = useCallback(
    async (form: EnquiryForm, editingId?: number) => {
      if (!form.applicantName.trim()) {
        setError('Applicant name is required');
        return false;
      }
      if (!form.parentPhone.trim()) {
        setError('Parent phone is required');
        return false;
      }
      if (form.apaarId && !isValidApaarId(form.apaarId)) {
        setError('APAAR ID must be exactly 12 digits');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const apaar_id = normalizeApaarId(form.apaarId) || undefined;
        const payload: Record<string, unknown> = {
          school_id: schoolId,
          applicant_name: form.applicantName.trim(),
          parent_phone: form.parentPhone.trim(),
          parent_name: form.parentName.trim() || undefined,
          parent_email: form.parentEmail.trim() || undefined,
          apaar_id,
          date_of_birth: form.dateOfBirth.trim() || undefined,
          gender: form.gender.trim() || undefined,
          applying_for_class: form.applyingForClass
            ? Number(form.applyingForClass)
            : undefined,
          application_date: form.applicationDate.trim() || toLocalDateStr(),
          next_follow_up_date: form.nextFollowUpDate.trim() || undefined,
          source: form.source || 'Front Office',
          reference: form.reference || 'Self',
          status: form.status || 'enquiry',
          assigned_to: form.assignedTo ? Number(form.assignedTo) : undefined,
          assigned_name: form.assignedName.trim() || undefined,
          address: form.address.trim() || undefined,
          previous_school: form.previousSchool.trim() || undefined,
          number_of_child: form.numberOfChild.trim()
            ? Number(form.numberOfChild)
            : undefined,
          remarks: form.remarks.trim() || undefined,
        };
        if (editingId) {
          const { school_id: _s, ...upd } = payload;
          await admissionsApi.update(editingId, upd, schoolId);
        } else {
          await admissionsApi.create(payload);
        }
        setEnquiryPage(1);
        await Promise.all([loadEnquiries(), loadStatusCounts()]);
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save enquiry failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadEnquiries, loadStatusCounts],
  );

  const removeEnquiry = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await admissionsApi.softDelete(id, schoolId);
        await Promise.all([loadEnquiries(), loadStatusCounts()]);
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate enquiry failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadEnquiries, loadStatusCounts],
  );

  const moveEnquiryStatus = useCallback(
    async (id: number, nextStageOrStatus: string) => {
      setBusy(true);
      setError(null);
      try {
        const stage = ADMISSION_PIPELINE_STAGES.find(
          (s) => s.key === nextStageOrStatus || s.writeStatus === nextStageOrStatus,
        );
        const nextStatus = stage?.writeStatus || nextStageOrStatus;
        await admissionsApi.update(id, { status: nextStatus }, schoolId);
        await Promise.all([loadEnquiries(), loadStatusCounts()]);
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Status update failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadEnquiries, loadStatusCounts],
  );

  const saveVisitor = useCallback(
    async (form: VisitorForm, editingId?: number) => {
      if (!form.visitorName.trim()) {
        setError('Visitor name is required');
        return false;
      }
      if (!form.visitingWhom.trim()) {
        setError('Meeting with is required');
        return false;
      }
      if (!form.visitDate) {
        setError('Visit date is required');
        return false;
      }
      if (!form.inTime) {
        setError('In time is required');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const checkIn = combineDateAndTime(form.visitDate, form.inTime);
        const checkOut = combineDateAndTime(form.visitDate, form.outTime);
        const payload: Record<string, unknown> = {
          visitor_name: form.visitorName.trim(),
          phone: form.phone.trim() || undefined,
          id_type: form.idType || 'other',
          id_number: form.idNumber.trim() || undefined,
          purpose: form.purpose || 'meeting',
          visiting_whom: form.visitingWhom.trim(),
          check_in: checkIn,
          check_out: checkOut,
          photo_url: form.photoUrl.trim() || undefined,
          status: checkOut ? 'checked_out' : form.status || 'checked_in',
          remarks: buildVisitorRemarks(form.note, {
            visitDate: form.visitDate,
            numberOfPerson: Number(form.numberOfPerson) || 1,
            attachmentName: form.attachmentName.trim() || undefined,
          }),
        };
        if (editingId) {
          const { school_id: _s, ...upd } = payload;
          await visitorsApi.update(editingId, upd, schoolId);
        } else {
          await visitorsApi.create({ school_id: schoolId, ...payload });
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
        setError(extractErrorMessage(e, 'Deactivate visitor failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadVisitors],
  );

  const checkOutVisitor = useCallback(
    async (id: number) => {
      setBusy(true);
      setError(null);
      try {
        await visitorsApi.update(
          id,
          { check_out: new Date().toISOString(), status: 'checked_out' },
          schoolId,
        );
        await loadVisitors();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Check-out failed'));
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
          reported_by: form.reportedBy.trim() ? Number(form.reportedBy) : undefined,
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
        setError(extractErrorMessage(e, 'Deactivate incident failed'));
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
        setError(extractErrorMessage(e, 'Deactivate contact failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadContacts],
  );

  const savePhoneCall = useCallback(
    async (form: PhoneCallForm, editingId?: number) => {
      if (!form.phone.trim()) {
        setError('Phone is required');
        return false;
      }
      if (!form.date.trim()) {
        setError('Date is required');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const payload = {
          school_id: schoolId,
          name: form.name.trim() || undefined,
          phone: form.phone.trim(),
          date: form.date,
          description: form.description.trim() || undefined,
          next_follow_up_date: form.nextFollowUpDate.trim() || undefined,
          call_duration: form.callDuration.trim() || undefined,
          note: form.note.trim() || undefined,
          call_type: form.callType || 'incoming',
        };
        if (editingId) {
          const { school_id: _s, ...upd } = payload;
          await phoneCallLogsApi.update(editingId, upd, schoolId);
        } else {
          await phoneCallLogsApi.create(payload);
        }
        await loadFrontOffice();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save phone call failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadFrontOffice],
  );

  const removePhoneCall = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await phoneCallLogsApi.softDelete(id, schoolId);
        await loadFrontOffice();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Remove phone call failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadFrontOffice],
  );

  const savePostalDispatch = useCallback(
    async (form: PostalDispatchForm, editingId?: number) => {
      if (!form.toTitle.trim()) {
        setError('To title is required');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const payload = {
          school_id: schoolId,
          to_title: form.toTitle.trim(),
          reference_no: form.referenceNo.trim() || undefined,
          address: form.address.trim() || undefined,
          note: form.note.trim() || undefined,
          from_title: form.fromTitle.trim() || undefined,
          date: form.date.trim() || toLocalDateStr(),
          attachment_name: form.attachmentName.trim() || undefined,
        };
        if (editingId) {
          const { school_id: _s, ...upd } = payload;
          await postalDispatchApi.update(editingId, upd, schoolId);
        } else {
          await postalDispatchApi.create(payload);
        }
        await loadFrontOffice();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save postal dispatch failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadFrontOffice],
  );

  const removePostalDispatch = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await postalDispatchApi.softDelete(id, schoolId);
        await loadFrontOffice();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Remove postal dispatch failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadFrontOffice],
  );

  const savePostalReceive = useCallback(
    async (form: PostalReceiveForm, editingId?: number) => {
      if (!form.fromTitle.trim()) {
        setError('From title is required');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const payload = {
          school_id: schoolId,
          from_title: form.fromTitle.trim(),
          reference_no: form.referenceNo.trim() || undefined,
          address: form.address.trim() || undefined,
          note: form.note.trim() || undefined,
          to_title: form.toTitle.trim() || undefined,
          date: form.date.trim() || toLocalDateStr(),
          attachment_name: form.attachmentName.trim() || undefined,
        };
        if (editingId) {
          const { school_id: _s, ...upd } = payload;
          await postalReceiveApi.update(editingId, upd, schoolId);
        } else {
          await postalReceiveApi.create(payload);
        }
        await loadFrontOffice();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save postal receive failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadFrontOffice],
  );

  const removePostalReceive = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await postalReceiveApi.softDelete(id, schoolId);
        await loadFrontOffice();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Remove postal receive failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadFrontOffice],
  );

  return useMemo(
    () => ({
      status,
      error,
      busy,
      schoolId,
      classes,
      staff,
      enquiries,
      filteredEnquiries,
      boardEnquiries: enrichedBoardEnquiries,
      pipelineStageCounts,
      pipelineKpis,
      activePipelineStage,
      activePipelineStep,
      visitors,
      filteredVisitors,
      visitorStats,
      incidents,
      contacts,
      phoneCalls,
      postalDispatch,
      postalReceive,
      statusCounts,
      dueTodayCount,
      enquiryTotal,
      visitorTotal,
      incidentTotal,
      contactTotal,
      enquiryPage,
      visitorPage,
      incidentPage,
      contactPage,
      enquiryPages,
      visitorPages,
      incidentPages,
      contactPages,
      searchName,
      searchPhone,
      searchSource,
      searchClass,
      statusFilter,
      visitorSearch,
      purposeFilter,
      visitorStatusFilter,
      incidentTypeFilter,
      severityFilter,
      contactTypeFilter,
      frontOfficeQuery,
      setSearchName: (v: string) => {
        setSearchName(v);
        setEnquiryPage(1);
      },
      setSearchPhone: (v: string) => {
        setSearchPhone(v);
        setEnquiryPage(1);
      },
      setSearchSource: (v: string) => {
        setSearchSource(v);
        setEnquiryPage(1);
      },
      setSearchClass: (v: string) => {
        setSearchClass(v);
        setEnquiryPage(1);
      },
      setStatusFilter: (v: string) => {
        setStatusFilter(v);
        setEnquiryPage(1);
      },
      setVisitorSearch,
      setPurpose,
      setVisitorStatus,
      setIncidentType,
      setSeverity,
      setContactType,
      setFrontOfficeQuery,
      setEnquiryPage,
      setVisitorPage,
      setIncidentPage,
      setContactPage,
      loadEnquiries,
      loadVisitors,
      loadIncidents,
      loadContacts,
      loadFrontOffice,
      loadLookups,
      loadStatusCounts,
      saveEnquiry,
      removeEnquiry,
      moveEnquiryStatus,
      saveVisitor,
      removeVisitor,
      checkOutVisitor,
      saveIncident,
      removeIncident,
      saveContact,
      removeContact,
      savePhoneCall,
      removePhoneCall,
      savePostalDispatch,
      removePostalDispatch,
      savePostalReceive,
      removePostalReceive,
      refetch: bootstrap,
      clearError: () => setError(null),
      today: toLocalDateStr,
      parseVisitorRemarks,
      buildVisitorRemarks,
    }),
    [
      status,
      error,
      busy,
      schoolId,
      classes,
      staff,
      enquiries,
      filteredEnquiries,
      enrichedBoardEnquiries,
      pipelineStageCounts,
      pipelineKpis,
      activePipelineStage,
      activePipelineStep,
      visitors,
      filteredVisitors,
      visitorStats,
      incidents,
      contacts,
      phoneCalls,
      postalDispatch,
      postalReceive,
      statusCounts,
      dueTodayCount,
      enquiryTotal,
      visitorTotal,
      incidentTotal,
      contactTotal,
      enquiryPage,
      visitorPage,
      incidentPage,
      contactPage,
      enquiryPages,
      visitorPages,
      incidentPages,
      contactPages,
      searchName,
      searchPhone,
      searchSource,
      searchClass,
      statusFilter,
      visitorSearch,
      purposeFilter,
      visitorStatusFilter,
      incidentTypeFilter,
      severityFilter,
      contactTypeFilter,
      frontOfficeQuery,
      setPurpose,
      setVisitorStatus,
      setIncidentType,
      setSeverity,
      setContactType,
      loadEnquiries,
      loadVisitors,
      loadIncidents,
      loadContacts,
      loadFrontOffice,
      loadLookups,
      loadStatusCounts,
      saveEnquiry,
      removeEnquiry,
      moveEnquiryStatus,
      saveVisitor,
      removeVisitor,
      checkOutVisitor,
      saveIncident,
      removeIncident,
      saveContact,
      removeContact,
      savePhoneCall,
      removePhoneCall,
      savePostalDispatch,
      removePostalDispatch,
      savePostalReceive,
      removePostalReceive,
      bootstrap,
    ],
  );
}
