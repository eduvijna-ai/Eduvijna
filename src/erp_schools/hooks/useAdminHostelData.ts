/**
 * Admin Hostel Management — web HostelTab school-wide parity.
 * Rooms · Allocations · Complaints (CRUD + soft-deactivate).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  hostelRoomsApi,
  hostelAllocationsApi,
  hostelComplaintsApi,
  studentsByUserApi,
} from '@core/api/erp.api';
import { USE_MOCK_DATA } from '../config';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import {
  extractErrorMessage,
  pickNumber,
  pickString,
  safeList,
  toLocalDateStr,
  type LoadStatus,
} from '../utils/apiHelpers';
import { roomDisplayName, studentDisplayName } from '../utils/hostelMeta';
import { useSchoolsSession } from './useSchoolsSession';

export type AdminHostelTab = 'rooms' | 'allocations' | 'complaints';

export type HostelStudentOption = {
  userId: number;
  profileId?: number;
  name: string;
  username: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  label: string;
};

export type HostelRoomRow = {
  id: number;
  schoolId: number;
  roomNumber: string;
  block: string;
  floor: number;
  roomType: string;
  capacity: number;
  occupied: number;
  monthlyRent: number;
  facilities: unknown[];
  status: string;
  isActive: boolean;
  displayName: string;
};

export type HostelAllocationRow = {
  id: number;
  schoolId: number;
  roomId: number;
  studentId: number;
  bedNumber: string;
  allotDate: string;
  vacateDate: string;
  status: string;
  remarks: string;
  isActive: boolean;
  studentLabel: string;
  roomLabel: string;
};

export type HostelComplaintRow = {
  id: number;
  schoolId: number;
  roomId: number | null;
  studentId: number;
  complaintType: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  resolutionNote: string;
  isActive: boolean;
  createdAt: string;
  roomLabel: string;
};

export type RoomForm = {
  block: string;
  roomNumber: string;
  floor: number;
  roomType: string;
  capacity: number;
  monthlyRent: number;
  status: string;
  facilitiesText: string;
};

export type AllocationForm = {
  studentId: string;
  roomId: string;
  bedNumber: string;
  allotDate: string;
  vacateDate: string;
  status?: string;
  remarks?: string;
  isActive?: boolean;
};

export type ComplaintForm = {
  subject: string;
  studentId: string;
  roomId: string;
  complaintType: string;
  priority: string;
  status: string;
  description: string;
  resolutionNote: string;
};

const PER_PAGE = 25;

function mapRoom(r: Record<string, unknown>): HostelRoomRow {
  const id = pickNumber(r.id);
  const block = pickString(r.block);
  const roomNumber = pickString(r.room_number);
  const floor = pickNumber(r.floor, 0);
  const facilities = Array.isArray(r.facilities) ? r.facilities : [];
  return {
    id,
    schoolId: pickNumber(r.school_id),
    roomNumber,
    block,
    floor,
    roomType: pickString(r.room_type, 'double').toLowerCase(),
    capacity: pickNumber(r.capacity, 1),
    occupied: pickNumber(r.occupied),
    monthlyRent: pickNumber(r.monthly_rent),
    facilities,
    status: pickString(r.status, 'available').toLowerCase(),
    isActive: r.is_active !== false,
    displayName: roomDisplayName({ id, block, roomNumber, floor }),
  };
}

function mapStudent(r: Record<string, unknown>): HostelStudentOption | null {
  const userId = pickNumber(r.user_id);
  if (!userId) return null;
  const opt: HostelStudentOption = {
    userId,
    profileId: r.profile_id != null ? pickNumber(r.profile_id) : undefined,
    name: pickString(r.name),
    username: pickString(r.username),
    admissionNumber: pickString(r.admission_number),
    className: pickString(r.class_name),
    sectionName: pickString(r.section_name),
    label: '',
  };
  opt.label = studentDisplayName(opt);
  return opt;
}

function mapAllocation(
  r: Record<string, unknown>,
  roomsById: Map<number, HostelRoomRow>,
  studentsByUserId: Map<number, HostelStudentOption>,
): HostelAllocationRow {
  const roomId = pickNumber(r.room_id);
  const studentId = pickNumber(r.student_id);
  const room = roomsById.get(roomId);
  const student = studentsByUserId.get(studentId);
  return {
    id: pickNumber(r.id),
    schoolId: pickNumber(r.school_id),
    roomId,
    studentId,
    bedNumber: pickString(r.bed_number),
    allotDate: pickString(r.allot_date).slice(0, 10),
    vacateDate: pickString(r.vacate_date).slice(0, 10),
    status: pickString(r.status, 'active').toLowerCase(),
    remarks: pickString(r.remarks),
    isActive: r.is_active !== false,
    studentLabel: student ? student.label : `Student #${studentId}`,
    roomLabel: room ? room.displayName : `Room #${roomId}`,
  };
}

function mapComplaint(
  r: Record<string, unknown>,
  roomsById: Map<number, HostelRoomRow>,
): HostelComplaintRow {
  const roomId =
    r.room_id != null && r.room_id !== '' ? pickNumber(r.room_id) : null;
  const room = roomId != null ? roomsById.get(roomId) : undefined;
  return {
    id: pickNumber(r.id),
    schoolId: pickNumber(r.school_id),
    roomId,
    studentId: pickNumber(r.student_id),
    complaintType: pickString(r.complaint_type, 'general').toLowerCase(),
    subject: pickString(r.subject),
    description: pickString(r.description),
    priority: pickString(r.priority, 'medium').toLowerCase(),
    status: pickString(r.status, 'open').toLowerCase(),
    resolutionNote: pickString(r.resolution_note),
    isActive: r.is_active !== false,
    createdAt: pickString(r.created_at).split('T')[0] || '',
    roomLabel: room ? room.displayName : roomId != null ? `Room #${roomId}` : '—',
  };
}

function parseFacilities(text: string): unknown[] | string | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function totalFrom(raw: unknown, fallback: number): number {
  if (raw && typeof raw === 'object' && 'total' in (raw as object)) {
    return pickNumber((raw as Record<string, unknown>).total, fallback);
  }
  return fallback;
}

export function useAdminHostelData() {
  const { schoolId: sid, isStudent, userId } = useSchoolsSession();
  const { selectedYearId } = useAcademicYear();
  const schoolId = sid ?? undefined;
  const academicYearId = selectedYearId ?? undefined;
  const canManage = !isStudent;

  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [rooms, setRooms] = useState<HostelRoomRow[]>([]);
  const [roomOptions, setRoomOptions] = useState<HostelRoomRow[]>([]);
  const [allocations, setAllocations] = useState<HostelAllocationRow[]>([]);
  const [complaints, setComplaints] = useState<HostelComplaintRow[]>([]);
  const [students, setStudents] = useState<HostelStudentOption[]>([]);

  const [roomTotal, setRoomTotal] = useState(0);
  const [allocationTotal, setAllocationTotal] = useState(0);
  const [complaintTotal, setComplaintTotal] = useState(0);

  const [roomPage, setRoomPage] = useState(1);
  const [allocationPage, setAllocationPage] = useState(1);
  const [complaintPage, setComplaintPage] = useState(1);
  const [complaintStatusFilter, setComplaintStatusFilter] = useState('');

  const studentsByUserId = useMemo(
    () => new Map(students.map((s) => [s.userId, s])),
    [students],
  );
  const roomsById = useMemo(
    () => new Map(roomOptions.map((r) => [r.id, r])),
    [roomOptions],
  );

  const loadRoomLookups = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) {
      setRoomOptions([]);
      return;
    }
    try {
      const raw = await hostelRoomsApi.list({
        per_page: 200,
        school_id: schoolId,
      });
      setRoomOptions(
        safeList<Record<string, unknown>>(raw)
          .map(mapRoom)
          .filter((r) => r.isActive),
      );
    } catch {
      setRoomOptions([]);
    }
  }, [schoolId]);

  const loadStudents = useCallback(async () => {
    if (USE_MOCK_DATA || !academicYearId) {
      setStudents([]);
      return;
    }
    try {
      const raw = await studentsByUserApi.getAll({
        academic_year_id: academicYearId,
      });
      const seen = new Set<number>();
      const opts: HostelStudentOption[] = [];
      for (const row of safeList<Record<string, unknown>>(raw)) {
        const opt = mapStudent(row);
        if (!opt || seen.has(opt.userId)) continue;
        seen.add(opt.userId);
        opts.push(opt);
      }
      setStudents(opts);
    } catch {
      setStudents([]);
    }
  }, [academicYearId]);

  const loadRooms = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await hostelRoomsApi.list({
        page: roomPage,
        per_page: PER_PAGE,
        school_id: schoolId,
      });
      const items = safeList<Record<string, unknown>>(raw).map(mapRoom);
      setRooms(items);
      setRoomTotal(totalFrom(raw, items.length));
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load rooms'));
      setRooms([]);
      setRoomTotal(0);
    }
  }, [schoolId, roomPage]);

  const loadAllocations = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await hostelAllocationsApi.list({
        page: allocationPage,
        per_page: PER_PAGE,
        school_id: schoolId,
      });
      const items = safeList<Record<string, unknown>>(raw).map((r) =>
        mapAllocation(r, roomsById, studentsByUserId),
      );
      setAllocations(items);
      setAllocationTotal(totalFrom(raw, items.length));
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load allocations'));
      setAllocations([]);
      setAllocationTotal(0);
    }
  }, [schoolId, allocationPage, roomsById, studentsByUserId]);

  const loadComplaints = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await hostelComplaintsApi.list({
        status: complaintStatusFilter || undefined,
        page: complaintPage,
        per_page: PER_PAGE,
        school_id: schoolId,
      });
      const items = safeList<Record<string, unknown>>(raw).map((r) =>
        mapComplaint(r, roomsById),
      );
      setComplaints(items);
      setComplaintTotal(totalFrom(raw, items.length));
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load complaints'));
      setComplaints([]);
      setComplaintTotal(0);
    }
  }, [schoolId, complaintPage, complaintStatusFilter, roomsById]);

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
      await Promise.all([loadRoomLookups(), loadStudents(), loadRooms()]);
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
    void loadRooms();
  }, [status, loadRooms]);

  useEffect(() => {
    if (status !== 'ready') return;
    void loadAllocations();
  }, [status, loadAllocations]);

  useEffect(() => {
    if (status !== 'ready') return;
    void loadComplaints();
  }, [status, loadComplaints]);

  useEffect(() => {
    if (status !== 'ready') return;
    void loadStudents();
  }, [status, loadStudents]);

  useEffect(() => {
    if (status !== 'ready') return;
    void loadRoomLookups();
  }, [status, loadRoomLookups]);

  const availableRoomsForForm = useCallback(
    (editingRoomId?: number | null) => {
      if (editingRoomId != null) {
        const current = roomsById.get(editingRoomId);
        const rest = roomOptions.filter(
          (r) =>
            r.id !== editingRoomId &&
            (r.status === 'available' || r.occupied < r.capacity),
        );
        return current ? [current, ...rest.filter((r) => r.id !== current.id)] : roomOptions;
      }
      return roomOptions.filter(
        (r) => r.status === 'available' || r.occupied < r.capacity,
      );
    },
    [roomOptions, roomsById],
  );

  const saveRoom = useCallback(
    async (form: RoomForm, editingId?: number) => {
      if (!form.roomNumber.trim()) {
        setError('Room number is required');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const facilities = parseFacilities(form.facilitiesText);
        const payload: Record<string, unknown> = {
          school_id: schoolId,
          room_number: form.roomNumber.trim(),
          block: form.block.trim() || undefined,
          floor: Number(form.floor ?? 1),
          room_type: form.roomType || 'double',
          capacity: Number(form.capacity ?? 2),
          monthly_rent: Number(form.monthlyRent ?? 0),
          status: form.status || 'available',
          facilities,
        };
        if (editingId) {
          const { school_id: _s, ...upd } = payload;
          await hostelRoomsApi.update(editingId, upd, schoolId);
        } else {
          await hostelRoomsApi.create(payload);
        }
        setRoomPage(1);
        await Promise.all([loadRooms(), loadRoomLookups()]);
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save room failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadRooms, loadRoomLookups],
  );

  const removeRoom = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await hostelRoomsApi.softDelete(id, schoolId);
        await Promise.all([loadRooms(), loadRoomLookups()]);
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadRooms, loadRoomLookups],
  );

  const saveAllocation = useCallback(
    async (form: AllocationForm, editingId?: number) => {
      if (!form.studentId || !form.roomId) {
        setError('Student and Room are required');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        if (editingId) {
          await hostelAllocationsApi.update(
            editingId,
            {
              bed_number: form.bedNumber.trim() || undefined,
              vacate_date: form.vacateDate.trim() || undefined,
              status: form.status,
              remarks: form.remarks,
              is_active: form.isActive,
            },
            schoolId,
          );
        } else {
          await hostelAllocationsApi.create({
            school_id: schoolId,
            student_id: Number(form.studentId),
            room_id: Number(form.roomId),
            bed_number: form.bedNumber.trim() || undefined,
            allot_date: form.allotDate.trim() || toLocalDateStr(),
            vacate_date: form.vacateDate.trim() || undefined,
          });
        }
        setAllocationPage(1);
        await Promise.all([loadAllocations(), loadRoomLookups(), loadRooms()]);
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save allocation failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadAllocations, loadRoomLookups, loadRooms],
  );

  const removeAllocation = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await hostelAllocationsApi.softDelete(id, schoolId);
        await Promise.all([loadAllocations(), loadRoomLookups(), loadRooms()]);
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadAllocations, loadRoomLookups, loadRooms],
  );

  const saveComplaint = useCallback(
    async (form: ComplaintForm, editingId?: number) => {
      if (!form.subject.trim()) {
        setError('Subject is required');
        return false;
      }
      const studentIdNum = form.studentId
        ? Number(form.studentId)
        : isStudent && userId
          ? userId
          : NaN;
      if (!editingId && !Number.isFinite(studentIdNum)) {
        setError('Student is required');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        if (editingId) {
          await hostelComplaintsApi.update(
            editingId,
            {
              room_id: form.roomId ? Number(form.roomId) : undefined,
              complaint_type: form.complaintType || 'general',
              priority: form.priority || 'medium',
              subject: form.subject.trim(),
              description: form.description.trim() || undefined,
              status: form.status || 'open',
              resolution_note: form.resolutionNote.trim() || undefined,
            },
            schoolId,
          );
        } else {
          await hostelComplaintsApi.create({
            school_id: schoolId,
            student_id: studentIdNum,
            subject: form.subject.trim(),
            room_id: form.roomId ? Number(form.roomId) : undefined,
            complaint_type: form.complaintType || 'general',
            description: form.description.trim() || undefined,
            priority: form.priority || 'medium',
          });
        }
        setComplaintPage(1);
        await loadComplaints();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save complaint failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, isStudent, userId, loadComplaints],
  );

  const removeComplaint = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await hostelComplaintsApi.softDelete(id, schoolId);
        await loadComplaints();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadComplaints],
  );

  const setComplaintFilter = useCallback((statusKey: string) => {
    setComplaintStatusFilter((prev) => (prev === statusKey ? '' : statusKey));
    setComplaintPage(1);
  }, []);

  const kpis = useMemo(() => {
    const source = roomOptions.length ? roomOptions : rooms;
    const totalRooms = source.length;
    const occupiedBeds = source.reduce((sum, r) => sum + r.occupied, 0);
    const capacity = source.reduce((sum, r) => sum + r.capacity, 0);
    const availableBeds = Math.max(0, capacity - occupiedBeds);
    const occupancyPct = capacity > 0 ? Math.round((occupiedBeds / capacity) * 100) : 0;
    return { totalRooms, occupiedBeds, availableBeds, occupancyPct, capacity };
  }, [roomOptions, rooms]);

  const roomPages = Math.max(1, Math.ceil(roomTotal / PER_PAGE));
  const allocationPages = Math.max(1, Math.ceil(allocationTotal / PER_PAGE));
  const complaintPages = Math.max(1, Math.ceil(complaintTotal / PER_PAGE));

  return useMemo(
    () => ({
      status,
      error,
      busy,
      canManage,
      isStudent,
      academicYearId,
      schoolId,
      rooms,
      roomOptions,
      allocations,
      complaints,
      students,
      roomTotal,
      allocationTotal,
      complaintTotal,
      roomPage,
      allocationPage,
      complaintPage,
      roomPages,
      allocationPages,
      complaintPages,
      complaintStatusFilter,
      kpis,
      setRoomPage,
      setAllocationPage,
      setComplaintPage,
      setComplaintFilter,
      availableRoomsForForm,
      loadRooms,
      loadAllocations,
      loadComplaints,
      saveRoom,
      removeRoom,
      saveAllocation,
      removeAllocation,
      saveComplaint,
      removeComplaint,
      refetch: bootstrap,
      clearError: () => setError(null),
    }),
    [
      status,
      error,
      busy,
      canManage,
      isStudent,
      academicYearId,
      schoolId,
      rooms,
      roomOptions,
      allocations,
      complaints,
      students,
      roomTotal,
      allocationTotal,
      complaintTotal,
      roomPage,
      allocationPage,
      complaintPage,
      roomPages,
      allocationPages,
      complaintPages,
      complaintStatusFilter,
      kpis,
      availableRoomsForForm,
      loadRooms,
      loadAllocations,
      loadComplaints,
      saveRoom,
      removeRoom,
      saveAllocation,
      removeAllocation,
      saveComplaint,
      removeComplaint,
      bootstrap,
    ],
  );
}
