/**
 * useTeacherStudentActions — student profile CRUD matching web StudentsTab / StudentDetailPanel.
 * Instructor: create/update profile, guardians, medical, documents. No soft-delete.
 */

import { useCallback, useState } from 'react';
import {
  documentsApi,
  guardiansApi,
  medicalApi,
  studentProfilesApi,
  uploadApi,
} from '@core/api/erp.api';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { extractErrorMessage, pickString, safeList } from '../utils/apiHelpers';
import { normalizeApaarId } from '../utils/apaarId';
import { useSchoolsSession } from './useSchoolsSession';

export type StudentProfileForm = {
  user_id?: number;
  admission_number?: string;
  apaar_id?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  city?: string;
  name?: string;
};

export type GuardianForm = {
  name: string;
  relation?: string;
  phone?: string;
  email?: string;
  is_primary?: boolean;
};

/** Mirrors web MedicalCreate fields used in StudentDetailPanel. */
export type MedicalForm = {
  blood_group?: string;
  allergies?: string;
  medical_conditions?: string;
  medications?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  doctor_name?: string;
  doctor_phone?: string;
};

export type DocumentForm = {
  document_type: string;
  document_name?: string;
  file_url: string;
};

export const STUDENT_DOCUMENT_TYPES = [
  { value: 'birth_certificate', label: 'Birth Certificate' },
  { value: 'aadhar_card', label: 'Aadhaar Card' },
  { value: 'transfer_certificate', label: 'Transfer Certificate' },
  { value: 'marksheet', label: 'Marksheet' },
  { value: 'photo', label: 'Photo' },
  { value: 'other', label: 'Other' },
] as const;

export function useTeacherStudentActions() {
  const { schoolId } = useSchoolsSession();
  const { selectedYearId } = useAcademicYear();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveProfile = useCallback(
    async (opts: { profileId?: number | null; form: StudentProfileForm }) => {
      setSaving(true);
      setError(null);
      try {
        const apaar = normalizeApaarId(opts.form.apaar_id) || undefined;
        if (opts.profileId) {
          const { user_id: _u, name: _n, ...updateData } = opts.form;
          await studentProfilesApi.update(
            opts.profileId,
            { ...updateData, apaar_id: apaar },
            schoolId ?? undefined,
            selectedYearId ?? undefined,
          );
        } else {
          if (!opts.form.user_id) {
            setError('User ID is required to create a profile');
            return false;
          }
          await studentProfilesApi.create(
            {
              user_id: opts.form.user_id,
              school_id: schoolId ?? undefined,
              admission_number: opts.form.admission_number,
              apaar_id: apaar,
              date_of_birth: opts.form.date_of_birth,
              gender: opts.form.gender,
              blood_group: opts.form.blood_group,
              city: opts.form.city,
            },
            selectedYearId ?? undefined,
          );
        }
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Failed to save student profile'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId, selectedYearId],
  );

  const loadDetail = useCallback(
    async (profileId: number) => {
      setError(null);
      try {
        const schoolParams = schoolId != null ? { school_id: schoolId } : undefined;
        const [profile, guardians, medical, docs] = await Promise.all([
          studentProfilesApi.getById(
            profileId,
            schoolId ?? undefined,
            selectedYearId ?? undefined,
          ),
          guardiansApi.getByStudent(profileId, schoolParams).catch(() => ({ items: [] })),
          medicalApi.getByStudent(profileId).catch(() => null),
          documentsApi.getByStudent(profileId, schoolParams).catch(() => ({ items: [] })),
        ]);
        return {
          profile: (profile ?? {}) as Record<string, unknown>,
          guardians: safeList<Record<string, unknown>>(guardians),
          medical: (medical ?? null) as Record<string, unknown> | null,
          documents: safeList<Record<string, unknown>>(docs),
        };
      } catch (e) {
        setError(extractErrorMessage(e, 'Failed to load student detail'));
        return null;
      }
    },
    [schoolId, selectedYearId],
  );

  const addGuardian = useCallback(
    async (studentId: number, form: GuardianForm) => {
      setSaving(true);
      setError(null);
      try {
        await guardiansApi.create({
          student_id: studentId,
          name: form.name,
          relation: form.relation || '',
          phone: form.phone,
          email: form.email,
          is_primary: form.is_primary ?? false,
          school_id: schoolId ?? undefined,
        });
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Failed to add guardian'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId],
  );

  const upsertMedical = useCallback(
    async (studentId: number, form: MedicalForm) => {
      setSaving(true);
      setError(null);
      try {
        await medicalApi.upsert(studentId, {
          ...form,
          student_id: studentId,
          school_id: schoolId ?? undefined,
        });
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Failed to save medical info'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId],
  );

  const addDocument = useCallback(
    async (studentId: number, form: DocumentForm) => {
      setSaving(true);
      setError(null);
      try {
        await documentsApi.create({
          student_id: studentId,
          school_id: schoolId ?? undefined,
          document_type: form.document_type,
          document_name: form.document_name,
          file_url: form.file_url,
        });
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Failed to add document'));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [schoolId],
  );

  const uploadDocumentFile = useCallback(
    async (file: { uri: string; name: string; mimeType?: string | null }) => {
      setSaving(true);
      setError(null);
      try {
        const formData = new FormData();
        formData.append('file', {
          uri: file.uri,
          name: file.name || 'document',
          type: file.mimeType || 'application/octet-stream',
        } as unknown as Blob);
        const res = (await uploadApi.uploadDocument(formData)) as {
          url?: string;
          filename?: string;
        };
        if (!res?.url) {
          setError('Upload failed');
          return null;
        }
        return {
          url: res.url,
          filename: res.filename || file.name,
        };
      } catch (e) {
        setError(extractErrorMessage(e, 'Upload failed'));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  return {
    saving,
    error,
    schoolId,
    saveProfile,
    loadDetail,
    addGuardian,
    upsertMedical,
    addDocument,
    uploadDocumentFile,
  };
}
