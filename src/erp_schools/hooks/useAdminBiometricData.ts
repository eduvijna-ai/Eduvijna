/**
 * Admin Biometric — web BiometricTab school-wide parity.
 * Devices · Enrollments · Logs (CRUD + soft-deactivate / delete).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  biometricDevicesApi,
  biometricEnrollmentsApi,
  biometricLogsApi,
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

export type AdminBiometricTab = 'devices' | 'enrollments' | 'logs';

export type BiometricDeviceRow = {
  id: number;
  schoolId: number;
  deviceName: string;
  deviceType: string;
  serialNumber: string;
  location: string;
  ipAddress: string;
  firmwareVersion: string;
  status: string;
  isActive: boolean;
};

export type BiometricEnrollmentRow = {
  id: number;
  schoolId: number;
  userId: number;
  deviceId: number;
  userType: string;
  biometricType: string;
  templateData: string;
  status: string;
  enrolledAt: string;
  isActive: boolean;
};

export type BiometricLogRow = {
  id: number;
  schoolId: number;
  deviceId: number;
  userId: number;
  punchType: string;
  verificationMode: string;
  punchTime: string;
  temperature: number | null;
  remarks: string;
  isActive: boolean;
};

export type DeviceForm = {
  deviceName: string;
  deviceType: string;
  serialNumber: string;
  ipAddress: string;
  location: string;
  firmwareVersion: string;
  status: string;
};

export type EnrollmentForm = {
  userId: string;
  deviceId: string;
  biometricType: string;
  templateData: string;
  status: string;
};

export type LogForm = {
  deviceId: string;
  userId: string;
  punchType: string;
  verificationMode: string;
  temperature: string;
  remarks: string;
};

const PER_PAGE = 25;

function totalFrom(raw: unknown, fallback: number): number {
  if (raw && typeof raw === 'object' && 'total' in (raw as object)) {
    return pickNumber((raw as Record<string, unknown>).total, fallback);
  }
  return fallback;
}

function mapDevice(r: Record<string, unknown>): BiometricDeviceRow {
  return {
    id: pickNumber(r.id),
    schoolId: pickNumber(r.school_id),
    deviceName: pickString(r.device_name),
    deviceType: pickString(r.device_type, 'fingerprint').toLowerCase(),
    serialNumber: pickString(r.serial_number),
    location: pickString(r.location),
    ipAddress: pickString(r.ip_address),
    firmwareVersion: pickString(r.firmware_version),
    status: pickString(r.status, 'active').toLowerCase(),
    isActive: r.is_active !== false,
  };
}

function mapEnrollment(r: Record<string, unknown>): BiometricEnrollmentRow {
  return {
    id: pickNumber(r.id),
    schoolId: pickNumber(r.school_id),
    userId: pickNumber(r.user_id),
    deviceId: pickNumber(r.device_id),
    userType: pickString(r.user_type),
    biometricType: pickString(
      r.biometric_type,
      pickString(r.user_type, 'fingerprint'),
    ).toLowerCase(),
    templateData: pickString(r.template_data, pickString(r.biometric_id)),
    status: pickString(r.status, 'pending').toLowerCase(),
    enrolledAt: pickString(r.enrolled_at),
    isActive: r.is_active !== false,
  };
}

function mapLog(r: Record<string, unknown>): BiometricLogRow {
  const temp =
    r.temperature != null && r.temperature !== ''
      ? pickNumber(r.temperature)
      : null;
  return {
    id: pickNumber(r.id),
    schoolId: pickNumber(r.school_id),
    deviceId: pickNumber(r.device_id),
    userId: pickNumber(r.user_id),
    punchType: pickString(r.punch_type, 'in').toLowerCase(),
    verificationMode: pickString(r.verification_mode, 'fingerprint').toLowerCase(),
    punchTime: pickString(r.punch_time),
    temperature: temp,
    remarks: pickString(r.remarks),
    isActive: r.is_active !== false,
  };
}

export function useAdminBiometricData() {
  const { schoolId: sid, isStudent } = useSchoolsSession();
  const schoolId = sid ?? undefined;
  const canManage = !isStudent;

  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [devices, setDevices] = useState<BiometricDeviceRow[]>([]);
  const [enrollments, setEnrollments] = useState<BiometricEnrollmentRow[]>([]);
  const [logs, setLogs] = useState<BiometricLogRow[]>([]);

  const [deviceTotal, setDeviceTotal] = useState(0);
  const [enrollmentTotal, setEnrollmentTotal] = useState(0);
  const [logTotal, setLogTotal] = useState(0);

  const [devicePage, setDevicePage] = useState(1);
  const [enrollmentPage, setEnrollmentPage] = useState(1);
  const [logPage, setLogPage] = useState(1);

  const [typeFilter, setTypeFilter] = useState('');
  const [enrollStatusFilter, setEnrollStatusFilter] = useState('');
  const [punchFilter, setPunchFilter] = useState('');

  const loadDevices = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await biometricDevicesApi.list({
        device_type: typeFilter || undefined,
        page: devicePage,
        per_page: PER_PAGE,
        school_id: schoolId,
      });
      const items = safeList<Record<string, unknown>>(raw).map(mapDevice);
      setDevices(items);
      setDeviceTotal(totalFrom(raw, items.length));
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load devices'));
      setDevices([]);
      setDeviceTotal(0);
    }
  }, [schoolId, devicePage, typeFilter]);

  const loadEnrollments = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await biometricEnrollmentsApi.list({
        status: enrollStatusFilter || undefined,
        page: enrollmentPage,
        per_page: PER_PAGE,
        school_id: schoolId,
      });
      const items = safeList<Record<string, unknown>>(raw).map(mapEnrollment);
      setEnrollments(items);
      setEnrollmentTotal(totalFrom(raw, items.length));
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load enrollments'));
      setEnrollments([]);
      setEnrollmentTotal(0);
    }
  }, [schoolId, enrollmentPage, enrollStatusFilter]);

  const loadLogs = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await biometricLogsApi.list({
        punch_type: punchFilter || undefined,
        page: logPage,
        per_page: PER_PAGE,
        school_id: schoolId,
      });
      const items = safeList<Record<string, unknown>>(raw).map(mapLog);
      setLogs(items);
      setLogTotal(totalFrom(raw, items.length));
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load logs'));
      setLogs([]);
      setLogTotal(0);
    }
  }, [schoolId, logPage, punchFilter]);

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
      await loadDevices();
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
    void loadDevices();
  }, [status, loadDevices]);

  useEffect(() => {
    if (status !== 'ready') return;
    void loadEnrollments();
  }, [status, loadEnrollments]);

  useEffect(() => {
    if (status !== 'ready') return;
    void loadLogs();
  }, [status, loadLogs]);

  const setDeviceTypeFilter = useCallback((v: string) => {
    setTypeFilter(v);
    setDevicePage(1);
  }, []);

  const setEnrollmentFilter = useCallback((v: string) => {
    setEnrollStatusFilter(v);
    setEnrollmentPage(1);
  }, []);

  const setLogPunchFilter = useCallback((v: string) => {
    setPunchFilter(v);
    setLogPage(1);
  }, []);

  const saveDevice = useCallback(
    async (form: DeviceForm, editingId?: number) => {
      if (!form.deviceName.trim() || !form.serialNumber.trim()) {
        setError('Name & serial required');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const payload: Record<string, unknown> = {
          school_id: schoolId,
          device_name: form.deviceName.trim(),
          device_type: form.deviceType || 'fingerprint',
          serial_number: form.serialNumber.trim(),
          ip_address: form.ipAddress.trim() || undefined,
          location: form.location.trim() || undefined,
          firmware_version: form.firmwareVersion.trim() || undefined,
          status: form.status || 'active',
        };
        if (editingId) {
          const { school_id: _s, ...upd } = payload;
          await biometricDevicesApi.update(editingId, upd, schoolId);
        } else {
          await biometricDevicesApi.create(payload);
        }
        setDevicePage(1);
        await loadDevices();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadDevices],
  );

  const removeDevice = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await biometricDevicesApi.softDelete(id, schoolId);
        await loadDevices();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadDevices],
  );

  const saveEnrollment = useCallback(
    async (form: EnrollmentForm, editingId?: number) => {
      if (!form.userId || !form.deviceId) {
        setError('User & Device IDs required');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const payload: Record<string, unknown> = {
          school_id: schoolId,
          user_id: Number(form.userId),
          device_id: Number(form.deviceId),
          biometric_type: form.biometricType || 'fingerprint',
          template_data: form.templateData.trim() || undefined,
          status: form.status || 'pending',
        };
        if (editingId) {
          const { school_id: _s, ...upd } = payload;
          await biometricEnrollmentsApi.update(editingId, upd, schoolId);
        } else {
          await biometricEnrollmentsApi.create(payload);
        }
        setEnrollmentPage(1);
        await loadEnrollments();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadEnrollments],
  );

  const removeEnrollment = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await biometricEnrollmentsApi.softDelete(id, schoolId);
        await loadEnrollments();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadEnrollments],
  );

  const saveLog = useCallback(
    async (form: LogForm, editingId?: number) => {
      if (!form.deviceId || !form.userId) {
        setError('Device & User IDs required');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const tempTrim = form.temperature.trim();
        const payload: Record<string, unknown> = {
          school_id: schoolId,
          device_id: Number(form.deviceId),
          user_id: Number(form.userId),
          punch_type: form.punchType || 'in',
          verification_mode: form.verificationMode || 'fingerprint',
          temperature: tempTrim ? Number(tempTrim) : null,
          remarks: form.remarks.trim() || undefined,
        };
        if (editingId) {
          const { school_id: _s, ...upd } = payload;
          await biometricLogsApi.update(editingId, upd, schoolId);
        } else {
          await biometricLogsApi.create(payload);
        }
        setLogPage(1);
        await loadLogs();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadLogs],
  );

  const removeLog = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await biometricLogsApi.softDelete(id, schoolId);
        await loadLogs();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Delete failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadLogs],
  );

  const devicePages = Math.max(1, Math.ceil(deviceTotal / PER_PAGE) || 1);
  const enrollmentPages = Math.max(1, Math.ceil(enrollmentTotal / PER_PAGE) || 1);
  const logPages = Math.max(1, Math.ceil(logTotal / PER_PAGE) || 1);

  return useMemo(
    () => ({
      status,
      error,
      busy,
      canManage,
      schoolId,
      devices,
      enrollments,
      logs,
      deviceTotal,
      enrollmentTotal,
      logTotal,
      devicePage,
      enrollmentPage,
      logPage,
      devicePages,
      enrollmentPages,
      logPages,
      typeFilter,
      enrollStatusFilter,
      punchFilter,
      setDevicePage,
      setEnrollmentPage,
      setLogPage,
      setDeviceTypeFilter,
      setEnrollmentFilter,
      setLogPunchFilter,
      loadDevices,
      loadEnrollments,
      loadLogs,
      saveDevice,
      removeDevice,
      saveEnrollment,
      removeEnrollment,
      saveLog,
      removeLog,
      refetch: bootstrap,
      clearError: () => setError(null),
    }),
    [
      status,
      error,
      busy,
      canManage,
      schoolId,
      devices,
      enrollments,
      logs,
      deviceTotal,
      enrollmentTotal,
      logTotal,
      devicePage,
      enrollmentPage,
      logPage,
      devicePages,
      enrollmentPages,
      logPages,
      typeFilter,
      enrollStatusFilter,
      punchFilter,
      setDeviceTypeFilter,
      setEnrollmentFilter,
      setLogPunchFilter,
      loadDevices,
      loadEnrollments,
      loadLogs,
      saveDevice,
      removeDevice,
      saveEnrollment,
      removeEnrollment,
      saveLog,
      removeLog,
      bootstrap,
    ],
  );
}
