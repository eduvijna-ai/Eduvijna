/**
 * Admin Parent Portal — web ParentPortalTab school-wide parity.
 * PTM Schedules · Appointments · Communications (CRUD + soft-deactivate).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ptmSchedulesApi,
  ptmAppointmentsApi,
  parentCommunicationsApi,
  studentsByUserApi,
  staffProfilesApi,
  guardiansApi,
} from '@core/api/erp.api';
import { USE_MOCK_DATA } from '../config';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import {
  extractErrorMessage,
  pickNumber,
  pickString,
  safeList,
  type LoadStatus,
} from '../utils/apiHelpers';
import { useSchoolsSession } from './useSchoolsSession';

export type AdminParentPortalTab = 'schedules' | 'appointments' | 'communications';

export type StudentOption = {
  userId: number;
  profileId: number;
  name: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
};

export type StaffOption = {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  designation: string;
};

export type GuardianOption = {
  id: number;
  name: string;
  relation: string;
};

export type ScheduleRow = {
  id: number;
  title: string;
  meetingType: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  venue: string;
  status: string;
  description: string;
  isActive: boolean;
};

export type AppointmentRow = {
  id: number;
  scheduleId: number;
  parentId: number;
  teacherId: number;
  studentId: number;
  slotTime: string;
  status: string;
  parentRemarks: string;
  teacherRemarks: string;
  isActive: boolean;
};

export type CommunicationRow = {
  id: number;
  parentId: number;
  studentId: number;
  commType: string;
  subject: string;
  message: string;
  reply: string;
  status: string;
  isActive: boolean;
};

export type ScheduleForm = {
  title: string;
  meetingType: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  venue: string;
  status: string;
  description: string;
};

export type AppointmentForm = {
  scheduleId: string;
  studentId: string;
  parentId: string;
  teacherId: string;
  slotTime: string;
  status: string;
  parentRemarks: string;
  teacherRemarks: string;
};

export type CommunicationForm = {
  studentId: string;
  parentId: string;
  commType: string;
  subject: string;
  message: string;
  reply: string;
  status: string;
};

const PER_PAGE = 25;

function mapSchedule(r: Record<string, unknown>): ScheduleRow {
  return {
    id: pickNumber(r.id),
    title: pickString(r.title),
    meetingType: pickString(r.meeting_type, 'general'),
    meetingDate: pickString(r.meeting_date),
    startTime: pickString(r.start_time),
    endTime: pickString(r.end_time),
    venue: pickString(r.venue),
    status: pickString(r.status, 'scheduled'),
    description: pickString(r.description),
    isActive: r.is_active !== false,
  };
}

function mapAppointment(r: Record<string, unknown>): AppointmentRow {
  return {
    id: pickNumber(r.id),
    scheduleId: pickNumber(r.schedule_id),
    parentId: pickNumber(r.parent_id),
    teacherId: pickNumber(r.teacher_id),
    studentId: pickNumber(r.student_id),
    slotTime: pickString(r.slot_time),
    status: pickString(r.status, 'booked'),
    parentRemarks: pickString(r.parent_remarks),
    teacherRemarks: pickString(r.teacher_remarks),
    isActive: r.is_active !== false,
  };
}

function mapCommunication(r: Record<string, unknown>): CommunicationRow {
  return {
    id: pickNumber(r.id),
    parentId: pickNumber(r.parent_id),
    studentId: pickNumber(r.student_id),
    commType: pickString(r.comm_type, 'message'),
    subject: pickString(r.subject),
    message: pickString(r.message),
    reply: pickString(r.reply),
    status: pickString(r.status, 'sent'),
    isActive: r.is_active !== false,
  };
}

function mapStudent(r: Record<string, unknown>): StudentOption | null {
  const userId = pickNumber(r.user_id);
  if (!userId) return null;
  return {
    userId,
    profileId: pickNumber(r.profile_id, pickNumber(r.id)),
    name: pickString(r.name, 'Student'),
    admissionNumber: pickString(r.admission_number),
    className: pickString(r.class_name),
    sectionName: pickString(r.section_name),
  };
}

function mapStaff(r: Record<string, unknown>): StaffOption {
  return {
    id: pickNumber(r.id),
    userId: pickNumber(r.user_id, pickNumber(r.id)),
    firstName: pickString(r.first_name),
    lastName: pickString(r.last_name),
    designation: pickString(r.designation),
  };
}

function mapGuardian(r: Record<string, unknown>): GuardianOption {
  return {
    id: pickNumber(r.id),
    name: pickString(r.name),
    relation: pickString(r.relation),
  };
}

function pickTotal(raw: unknown, fallback: number): number {
  if (raw && typeof raw === 'object' && 'total' in (raw as object)) {
    return pickNumber((raw as Record<string, unknown>).total, fallback);
  }
  return fallback;
}

export function studentLabel(s: StudentOption): string {
  const adm = s.admissionNumber ? ` (${s.admissionNumber})` : '';
  const cls = s.className
    ? ` — ${s.className}${s.sectionName ? ` ${s.sectionName}` : ''}`
    : '';
  return `${s.name || 'Student'}${adm}${cls}`;
}

export function staffLabel(s: StaffOption): string {
  const name = `${s.firstName}${s.lastName ? ` ${s.lastName}` : ''}`.trim() || `#${s.id}`;
  return s.designation ? `${name} — ${s.designation}` : name;
}

export function useAdminParentPortalData() {
  const { schoolId: sid, userId } = useSchoolsSession();
  const schoolId = sid ?? undefined;
  const { selectedYearId } = useAcademicYear();
  const academicYearId = selectedYearId ?? undefined;

  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [communications, setCommunications] = useState<CommunicationRow[]>([]);
  const [scheduleCatalog, setScheduleCatalog] = useState<ScheduleRow[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [guardians, setGuardians] = useState<GuardianOption[]>([]);
  /** Cache guardians by student user_id for list labels. */
  const [guardianCache, setGuardianCache] = useState<Record<number, GuardianOption>>({});

  const [scheduleTotal, setScheduleTotal] = useState(0);
  const [appointmentTotal, setAppointmentTotal] = useState(0);
  const [commTotal, setCommTotal] = useState(0);

  const [schedulePage, setSchedulePage] = useState(1);
  const [appointmentPage, setAppointmentPage] = useState(1);
  const [commPage, setCommPage] = useState(1);

  const [meetingTypeFilter, setMeetingTypeFilter] = useState('');
  const [apptStatusFilter, setApptStatusFilter] = useState('');
  const [commTypeFilter, setCommTypeFilter] = useState('');
  const [commStatusFilter, setCommStatusFilter] = useState('');

  const loadSchedules = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await ptmSchedulesApi.list({
        meeting_type: meetingTypeFilter || undefined,
        page: schedulePage,
        per_page: PER_PAGE,
        school_id: schoolId,
      });
      const list = safeList<Record<string, unknown>>(raw).map(mapSchedule);
      setSchedules(list);
      setScheduleTotal(pickTotal(raw, list.length));
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load schedules'));
      setSchedules([]);
      setScheduleTotal(0);
    }
  }, [schoolId, schedulePage, meetingTypeFilter]);

  const loadAppointments = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await ptmAppointmentsApi.list({
        status: apptStatusFilter || undefined,
        page: appointmentPage,
        per_page: PER_PAGE,
        school_id: schoolId,
      });
      const list = safeList<Record<string, unknown>>(raw).map(mapAppointment);
      setAppointments(list);
      setAppointmentTotal(pickTotal(raw, list.length));
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load appointments'));
      setAppointments([]);
      setAppointmentTotal(0);
    }
  }, [schoolId, appointmentPage, apptStatusFilter]);

  const loadCommunications = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await parentCommunicationsApi.list({
        comm_type: commTypeFilter || undefined,
        status: commStatusFilter || undefined,
        page: commPage,
        per_page: PER_PAGE,
        school_id: schoolId,
      });
      const list = safeList<Record<string, unknown>>(raw).map(mapCommunication);
      setCommunications(list);
      setCommTotal(pickTotal(raw, list.length));
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load communications'));
      setCommunications([]);
      setCommTotal(0);
    }
  }, [schoolId, commPage, commTypeFilter, commStatusFilter]);

  const loadScheduleCatalog = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await ptmSchedulesApi.list({
        per_page: 200,
        school_id: schoolId,
      });
      setScheduleCatalog(safeList<Record<string, unknown>>(raw).map(mapSchedule));
    } catch {
      setScheduleCatalog([]);
    }
  }, [schoolId]);

  const loadPeople = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const staffRaw = await staffProfilesApi.list({
        per_page: 200,
        school_id: schoolId,
      });
      setStaff(safeList<Record<string, unknown>>(staffRaw).map(mapStaff));
    } catch {
      setStaff([]);
    }
    if (!academicYearId) {
      setStudents([]);
      return;
    }
    try {
      const studentsRaw = await studentsByUserApi.getAll({
        academic_year_id: academicYearId,
      });
      const seen = new Set<number>();
      const opts: StudentOption[] = [];
      for (const row of safeList<Record<string, unknown>>(studentsRaw)) {
        const s = mapStudent(row);
        if (!s || seen.has(s.userId)) continue;
        seen.add(s.userId);
        opts.push(s);
      }
      setStudents(opts);
    } catch {
      setStudents([]);
    }
  }, [schoolId, academicYearId]);

  const loadGuardiansForStudent = useCallback(
    async (studentUserId: string | number | undefined) => {
      if (!studentUserId) {
        setGuardians([]);
        return;
      }
      const st = students.find((s) => s.userId === Number(studentUserId));
      if (!st?.profileId) {
        setGuardians([]);
        return;
      }
      try {
        const raw = await guardiansApi.getByStudent(st.profileId, {
          per_page: 50,
          school_id: schoolId,
        });
        const list = safeList<Record<string, unknown>>(raw).map(mapGuardian);
        setGuardians(list);
        setGuardianCache((prev) => {
          const next = { ...prev };
          for (const g of list) next[g.id] = g;
          return next;
        });
      } catch {
        setGuardians([]);
      }
    },
    [students, schoolId],
  );

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
        loadSchedules(),
        loadAppointments(),
        loadCommunications(),
        loadScheduleCatalog(),
        loadPeople(),
      ]);
      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e));
      setStatus('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, academicYearId]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status !== 'ready') return;
    void loadSchedules();
  }, [status, loadSchedules]);

  useEffect(() => {
    if (status !== 'ready') return;
    void loadAppointments();
  }, [status, loadAppointments]);

  useEffect(() => {
    if (status !== 'ready') return;
    void loadCommunications();
  }, [status, loadCommunications]);

  useEffect(() => {
    if (status !== 'ready') return;
    void loadPeople();
  }, [status, loadPeople]);

  const setMeetingType = useCallback((t: string) => {
    setMeetingTypeFilter(t);
    setSchedulePage(1);
  }, []);

  const setApptStatus = useCallback((s: string) => {
    setApptStatusFilter(s);
    setAppointmentPage(1);
  }, []);

  const setCommType = useCallback((t: string) => {
    setCommTypeFilter(t);
    setCommPage(1);
  }, []);

  const setCommStatus = useCallback((s: string) => {
    setCommStatusFilter(s);
    setCommPage(1);
  }, []);

  const studentName = useCallback(
    (uid: number) => {
      const s = students.find((x) => x.userId === uid);
      return s ? s.name || `#${uid}` : `#${uid}`;
    },
    [students],
  );

  const staffName = useCallback(
    (uid: number) => {
      const s = staff.find((x) => x.userId === uid || x.id === uid);
      if (!s) return `#${uid}`;
      return `${s.firstName}${s.lastName ? ` ${s.lastName}` : ''}`.trim() || `#${uid}`;
    },
    [staff],
  );

  const scheduleLabel = useCallback(
    (id: number) => {
      const s =
        scheduleCatalog.find((x) => x.id === id) || schedules.find((x) => x.id === id);
      return s ? `${s.title}${s.meetingDate ? ` — ${s.meetingDate}` : ''}` : `#${id}`;
    },
    [scheduleCatalog, schedules],
  );

  const parentName = useCallback(
    (id: number) => {
      const g = guardians.find((x) => x.id === id) || guardianCache[id];
      return g ? `${g.name}${g.relation ? ` (${g.relation})` : ''}` : `#${id}`;
    },
    [guardians, guardianCache],
  );

  const saveSchedule = useCallback(
    async (form: ScheduleForm, editingId?: number) => {
      if (!form.title.trim() || !form.meetingDate) {
        setError('Title & date required');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const payload = {
          school_id: schoolId,
          title: form.title.trim(),
          meeting_type: form.meetingType || 'general',
          meeting_date: form.meetingDate,
          start_time: form.startTime.trim() || undefined,
          end_time: form.endTime.trim() || undefined,
          venue: form.venue.trim() || undefined,
          status: form.status || 'scheduled',
          description: form.description.trim() || undefined,
          created_by: userId ?? 1,
        };
        if (editingId) {
          const { school_id: _s, created_by: _c, ...upd } = payload;
          await ptmSchedulesApi.update(editingId, upd, schoolId);
        } else {
          await ptmSchedulesApi.create(payload);
        }
        setSchedulePage(1);
        await Promise.all([loadSchedules(), loadScheduleCatalog()]);
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, userId, loadSchedules, loadScheduleCatalog],
  );

  const removeSchedule = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await ptmSchedulesApi.softDelete(id, schoolId);
        await Promise.all([loadSchedules(), loadScheduleCatalog()]);
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadSchedules, loadScheduleCatalog],
  );

  const saveAppointment = useCallback(
    async (form: AppointmentForm, editingId?: number) => {
      if (!form.scheduleId || !form.parentId || !form.teacherId || !form.studentId) {
        setError('Schedule, parent, teacher & student are required');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const payload = {
          school_id: schoolId,
          schedule_id: Number(form.scheduleId),
          parent_id: Number(form.parentId),
          teacher_id: Number(form.teacherId),
          student_id: Number(form.studentId),
          slot_time: form.slotTime.trim() || undefined,
          status: form.status || 'booked',
          parent_remarks: form.parentRemarks.trim() || undefined,
          teacher_remarks: form.teacherRemarks.trim() || undefined,
        };
        if (editingId) {
          const { school_id: _s, ...upd } = payload;
          await ptmAppointmentsApi.update(editingId, upd, schoolId);
        } else {
          await ptmAppointmentsApi.create(payload);
        }
        setAppointmentPage(1);
        await loadAppointments();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadAppointments],
  );

  const removeAppointment = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await ptmAppointmentsApi.softDelete(id, schoolId);
        await loadAppointments();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadAppointments],
  );

  const saveCommunication = useCallback(
    async (form: CommunicationForm, editingId?: number) => {
      if (!form.studentId || !form.parentId) {
        setError('Student & parent are required');
        return false;
      }
      if (!form.subject.trim() || !form.message.trim()) {
        setError('Subject & message required');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const payload: Record<string, unknown> = {
          school_id: schoolId,
          parent_id: Number(form.parentId),
          student_id: Number(form.studentId),
          comm_type: form.commType || 'message',
          subject: form.subject.trim(),
          message: form.message.trim(),
          status: form.status || 'sent',
        };
        if (editingId) {
          payload.reply = form.reply.trim() || undefined;
          const { school_id: _s, ...upd } = payload;
          await parentCommunicationsApi.update(editingId, upd, schoolId);
        } else {
          await parentCommunicationsApi.create(payload);
        }
        setCommPage(1);
        await loadCommunications();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadCommunications],
  );

  const removeCommunication = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await parentCommunicationsApi.softDelete(id, schoolId);
        await loadCommunications();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadCommunications],
  );

  const schedulePages = Math.max(1, Math.ceil(scheduleTotal / PER_PAGE));
  const appointmentPages = Math.max(1, Math.ceil(appointmentTotal / PER_PAGE));
  const commPages = Math.max(1, Math.ceil(commTotal / PER_PAGE));

  return useMemo(
    () => ({
      status,
      error,
      busy,
      academicYearId,
      schedules,
      appointments,
      communications,
      scheduleCatalog,
      students,
      staff,
      guardians,
      scheduleTotal,
      appointmentTotal,
      commTotal,
      schedulePage,
      appointmentPage,
      commPage,
      schedulePages,
      appointmentPages,
      commPages,
      meetingTypeFilter,
      apptStatusFilter,
      commTypeFilter,
      commStatusFilter,
      setMeetingType,
      setApptStatus,
      setCommType,
      setCommStatus,
      setSchedulePage,
      setAppointmentPage,
      setCommPage,
      loadGuardiansForStudent,
      clearGuardians: () => setGuardians([]),
      studentName,
      staffName,
      scheduleLabel,
      parentName,
      loadSchedules,
      loadAppointments,
      loadCommunications,
      saveSchedule,
      removeSchedule,
      saveAppointment,
      removeAppointment,
      saveCommunication,
      removeCommunication,
      refetch: bootstrap,
    }),
    [
      status,
      error,
      busy,
      academicYearId,
      schedules,
      appointments,
      communications,
      scheduleCatalog,
      students,
      staff,
      guardians,
      scheduleTotal,
      appointmentTotal,
      commTotal,
      schedulePage,
      appointmentPage,
      commPage,
      schedulePages,
      appointmentPages,
      commPages,
      meetingTypeFilter,
      apptStatusFilter,
      commTypeFilter,
      commStatusFilter,
      setMeetingType,
      setApptStatus,
      setCommType,
      setCommStatus,
      loadGuardiansForStudent,
      studentName,
      staffName,
      scheduleLabel,
      parentName,
      loadSchedules,
      loadAppointments,
      loadCommunications,
      saveSchedule,
      removeSchedule,
      saveAppointment,
      removeAppointment,
      saveCommunication,
      removeCommunication,
      bootstrap,
    ],
  );
}
