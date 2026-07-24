/**
 * useTeacherStaffProfile — live staff self-service (web StaffSelfServiceTab / getMyProfile).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { staffProfilesApi } from '@core/api/erp.api';
import { USE_MOCK_DATA } from '../config';
import { teacherProfile as mockProfile } from '../data';
import {
  extractErrorMessage,
  formatDisplayDate,
  pickString,
  type LoadStatus,
} from '../utils/apiHelpers';
import { useSchoolsSession } from './useSchoolsSession';

export type StaffProfileView = {
  id?: number;
  name: string;
  role: string;
  employeeId: string;
  email: string;
  phone: string;
  joinedOn: string;
  department?: string;
  designation?: string;
  subjects: string[];
  avatarUrl?: string;
  raw?: Record<string, unknown>;
};

function emptyProfile(sessionName: string, email: string): StaffProfileView {
  return {
    name: sessionName || 'Teacher',
    role: 'Instructor',
    employeeId: '—',
    email: email || '—',
    phone: '—',
    joinedOn: '—',
    subjects: [],
  };
}

function mapStaffProfile(
  raw: unknown,
  fallbackName: string,
  fallbackEmail: string,
): StaffProfileView {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const subjectsRaw = r.subjects ?? r.subject_names ?? r.teaching_subjects;
  let subjects: string[] = [];
  if (Array.isArray(subjectsRaw)) {
    subjects = subjectsRaw.map((s) =>
      typeof s === 'string' ? s : pickString((s as Record<string, unknown>)?.name, (s as Record<string, unknown>)?.subject_name),
    ).filter(Boolean);
  } else if (typeof subjectsRaw === 'string' && subjectsRaw.trim()) {
    subjects = subjectsRaw.split(',').map((s) => s.trim()).filter(Boolean);
  }

  return {
    id: r.id != null ? Number(r.id) : undefined,
    name: pickString(r.full_name, r.name, r.staff_name, fallbackName) || 'Teacher',
    role: pickString(r.designation, r.role_name, r.role, 'Instructor'),
    employeeId: pickString(r.employee_id, r.employee_code, r.staff_code, '—'),
    email: pickString(r.email, r.work_email, fallbackEmail) || '—',
    phone: pickString(r.phone, r.mobile, r.contact_number) || '—',
    joinedOn: formatDisplayDate(pickString(r.joining_date, r.joined_on, r.created_at) || null) || '—',
    department: pickString(r.department, r.department_name) || undefined,
    designation: pickString(r.designation) || undefined,
    subjects,
    avatarUrl: pickString(r.avatar_url, r.photo_url) || undefined,
    raw: r,
  };
}

export function useTeacherStaffProfile() {
  const session = useSchoolsSession();
  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<StaffProfileView>(() =>
    USE_MOCK_DATA
      ? {
          name: mockProfile.name,
          role: mockProfile.role,
          employeeId: mockProfile.employeeId,
          email: mockProfile.email,
          phone: mockProfile.phone,
          joinedOn: mockProfile.joinedOn,
          subjects: mockProfile.subjects,
          avatarUrl: mockProfile.avatarUrl,
        }
      : emptyProfile(session.displayName, session.email),
  );

  const load = useCallback(async () => {
    if (USE_MOCK_DATA) {
      setProfile({
        name: mockProfile.name,
        role: mockProfile.role,
        employeeId: mockProfile.employeeId,
        email: mockProfile.email,
        phone: mockProfile.phone,
        joinedOn: mockProfile.joinedOn,
        subjects: mockProfile.subjects,
        avatarUrl: mockProfile.avatarUrl,
      });
      setStatus('ready');
      return;
    }

    setStatus('loading');
    setError(null);
    try {
      const raw = await staffProfilesApi.getMyProfile(session.schoolId ?? undefined);
      setProfile(mapStaffProfile(raw, session.displayName, session.email));
      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load staff profile'));
      setProfile(emptyProfile(session.displayName, session.email));
      setStatus('error');
    }
  }, [session.schoolId, session.displayName, session.email]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateProfile = useCallback(
    async (patch: Partial<{
      phone: string;
      email: string;
      full_name: string;
      bank_account_number: string;
      bank_ifsc: string;
      bank_name: string;
    }>) => {
      setSaving(true);
      setError(null);
      try {
        const updated = await staffProfilesApi.updateMyProfile(
          patch,
          session.schoolId ?? undefined,
        );
        setProfile(mapStaffProfile(updated, session.displayName, session.email));
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Failed to update profile'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [session.schoolId, session.displayName, session.email],
  );

  return useMemo(
    () => ({
      profile,
      status,
      error,
      saving,
      refetch: load,
      updateProfile,
    }),
    [profile, status, error, saving, load, updateProfile],
  );
}
