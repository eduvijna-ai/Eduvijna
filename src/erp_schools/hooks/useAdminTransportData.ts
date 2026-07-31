/**
 * Admin Transport Management — web TransportTab school-wide parity.
 * Vehicles · Routes · Assignments (CRUD + soft-deactivate).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  vehiclesApi,
  routesApi,
  transportAssignmentsApi,
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

export const VEHICLE_STATUSES = ['active', 'maintenance', 'retired'] as const;

export type AdminTransportTab = 'vehicles' | 'routes' | 'assignments';

export type VehicleRow = {
  id: number;
  vehicleNumber: string;
  vehicleType: string;
  capacity: number;
  driverName: string;
  driverPhone: string;
  insuranceExpiry: string;
  fitnessExpiry: string;
  status: string;
  isActive: boolean;
};

export type RouteRow = {
  id: number;
  routeName: string;
  startPoint: string;
  endPoint: string;
  distanceKm: number | null;
  monthlyFee: number;
  vehicleId: number | null;
  stops: unknown[];
  description: string;
  isActive: boolean;
};

export type AssignmentRow = {
  id: number;
  studentId: number;
  routeId: number;
  pickupStop: string;
  dropStop: string;
  startDate: string;
  endDate: string;
  status: string;
  isActive: boolean;
};

export type VehicleForm = {
  vehicleNumber: string;
  vehicleType: string;
  capacity: number;
  driverName: string;
  driverPhone: string;
  insuranceExpiry: string;
  fitnessExpiry: string;
  status: string;
};

export type RouteForm = {
  routeName: string;
  startPoint: string;
  endPoint: string;
  distanceKm: string;
  vehicleId: string;
  monthlyFee: number;
  stopsText: string;
  description: string;
};

export type AssignmentForm = {
  studentId: string;
  routeId: string;
  pickupStop: string;
  dropStop: string;
  startDate: string;
  endDate: string;
};

const PER_PAGE = 25;

function mapVehicle(r: Record<string, unknown>): VehicleRow {
  return {
    id: pickNumber(r.id),
    vehicleNumber: pickString(r.vehicle_number),
    vehicleType: pickString(r.vehicle_type),
    capacity: pickNumber(r.capacity),
    driverName: pickString(r.driver_name),
    driverPhone: pickString(r.driver_phone),
    insuranceExpiry: pickString(r.insurance_expiry).slice(0, 10),
    fitnessExpiry: pickString(r.fitness_expiry).slice(0, 10),
    status: pickString(r.status, 'active').toLowerCase(),
    isActive: r.is_active !== false,
  };
}

function mapRoute(r: Record<string, unknown>): RouteRow {
  const stops = Array.isArray(r.stops) ? r.stops : [];
  return {
    id: pickNumber(r.id),
    routeName: pickString(r.route_name),
    startPoint: pickString(r.start_point),
    endPoint: pickString(r.end_point),
    distanceKm: r.distance_km != null && r.distance_km !== '' ? pickNumber(r.distance_km) : null,
    monthlyFee: pickNumber(r.monthly_fee),
    vehicleId: r.vehicle_id != null && r.vehicle_id !== '' ? pickNumber(r.vehicle_id) : null,
    stops,
    description: pickString(r.description),
    isActive: r.is_active !== false,
  };
}

function mapAssignment(r: Record<string, unknown>): AssignmentRow {
  return {
    id: pickNumber(r.id),
    studentId: pickNumber(r.student_id),
    routeId: pickNumber(r.route_id),
    pickupStop: pickString(r.pickup_stop),
    dropStop: pickString(r.drop_stop),
    startDate: pickString(r.start_date).slice(0, 10),
    endDate: pickString(r.end_date).slice(0, 10),
    status: pickString(r.status, 'active').toLowerCase(),
    isActive: r.is_active !== false,
  };
}

export function useAdminTransportData() {
  const { schoolId: sid } = useSchoolsSession();
  const schoolId = sid ?? undefined;

  const [status, setStatus] = useState<LoadStatus>(USE_MOCK_DATA ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  const [vehicleTotal, setVehicleTotal] = useState(0);
  const [routeTotal, setRouteTotal] = useState(0);
  const [assignmentTotal, setAssignmentTotal] = useState(0);

  const [vehiclePage, setVehiclePage] = useState(1);
  const [routePage, setRoutePage] = useState(1);
  const [assignmentPage, setAssignmentPage] = useState(1);

  const [vehicleQuery, setVehicleQuery] = useState('');

  const loadVehicles = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await vehiclesApi.list({
        q: vehicleQuery.trim() || undefined,
        page: vehiclePage,
        per_page: PER_PAGE,
        school_id: schoolId,
      });
      const items = safeList<Record<string, unknown>>(raw).map(mapVehicle);
      setVehicles(items);
      const total =
        raw && typeof raw === 'object' && 'total' in (raw as object)
          ? pickNumber((raw as Record<string, unknown>).total, items.length)
          : items.length;
      setVehicleTotal(total);
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load vehicles'));
      setVehicles([]);
      setVehicleTotal(0);
    }
  }, [schoolId, vehiclePage, vehicleQuery]);

  const loadRoutes = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await routesApi.list({
        page: routePage,
        per_page: PER_PAGE,
        school_id: schoolId,
      });
      const items = safeList<Record<string, unknown>>(raw).map(mapRoute);
      setRoutes(items);
      const total =
        raw && typeof raw === 'object' && 'total' in (raw as object)
          ? pickNumber((raw as Record<string, unknown>).total, items.length)
          : items.length;
      setRouteTotal(total);
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load routes'));
      setRoutes([]);
      setRouteTotal(0);
    }
  }, [schoolId, routePage]);

  const loadAssignments = useCallback(async () => {
    if (USE_MOCK_DATA || !schoolId) return;
    try {
      const raw = await transportAssignmentsApi.list({
        page: assignmentPage,
        per_page: PER_PAGE,
        school_id: schoolId,
      });
      const items = safeList<Record<string, unknown>>(raw).map(mapAssignment);
      setAssignments(items);
      const total =
        raw && typeof raw === 'object' && 'total' in (raw as object)
          ? pickNumber((raw as Record<string, unknown>).total, items.length)
          : items.length;
      setAssignmentTotal(total);
    } catch (e) {
      setError(extractErrorMessage(e, 'Failed to load assignments'));
      setAssignments([]);
      setAssignmentTotal(0);
    }
  }, [schoolId, assignmentPage]);

  // Full refresh (header Refresh) — uses current page/query loaders.
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
      await Promise.all([loadVehicles(), loadRoutes(), loadAssignments()]);
      setStatus('ready');
    } catch (e) {
      setError(extractErrorMessage(e));
      setStatus('error');
    }
  }, [schoolId, loadVehicles, loadRoutes, loadAssignments]);

  // Initial bootstrap when school is known.
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
        await Promise.all([loadVehicles(), loadRoutes(), loadAssignments()]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- school-scoped bootstrap only
  }, [schoolId]);

  // Page / search changes (silent — no full-screen loader).
  useEffect(() => {
    if (status !== 'ready' || USE_MOCK_DATA || !schoolId) return;
    void loadVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehiclePage, vehicleQuery]);

  useEffect(() => {
    if (status !== 'ready' || USE_MOCK_DATA || !schoolId) return;
    void loadRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routePage]);

  useEffect(() => {
    if (status !== 'ready' || USE_MOCK_DATA || !schoolId) return;
    void loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentPage]);

  const setVehicleSearch = useCallback((q: string) => {
    setVehicleQuery(q);
    setVehiclePage(1);
  }, []);

  const saveVehicle = useCallback(
    async (form: VehicleForm, editingId?: number) => {
      if (!form.vehicleNumber.trim()) {
        setError('Vehicle number is required');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const payload = {
          school_id: schoolId,
          vehicle_number: form.vehicleNumber.trim(),
          vehicle_type: form.vehicleType.trim() || undefined,
          capacity: form.capacity,
          driver_name: form.driverName.trim() || undefined,
          driver_phone: form.driverPhone.trim() || undefined,
          insurance_expiry: form.insuranceExpiry.trim() || undefined,
          fitness_expiry: form.fitnessExpiry.trim() || undefined,
          status: form.status || 'active',
        };
        if (editingId) await vehiclesApi.update(editingId, payload, schoolId);
        else await vehiclesApi.create(payload);
        setVehiclePage(1);
        await loadVehicles();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save vehicle failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadVehicles],
  );

  const removeVehicle = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await vehiclesApi.softDelete(id, schoolId);
        await loadVehicles();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadVehicles],
  );

  const saveRoute = useCallback(
    async (form: RouteForm, editingId?: number) => {
      if (!form.routeName.trim()) {
        setError('Route name is required');
        return false;
      }
      let stops: unknown[] = [];
      try {
        stops = JSON.parse(form.stopsText || '[]');
        if (!Array.isArray(stops)) throw new Error('not array');
      } catch {
        setError('Invalid stops JSON');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const payload: Record<string, unknown> = {
          school_id: schoolId,
          route_name: form.routeName.trim(),
          start_point: form.startPoint.trim() || undefined,
          end_point: form.endPoint.trim() || undefined,
          distance_km: form.distanceKm.trim()
            ? Number(form.distanceKm)
            : undefined,
          vehicle_id: form.vehicleId.trim()
            ? Number(form.vehicleId)
            : undefined,
          monthly_fee: Number(form.monthlyFee || 0),
          stops,
          description: form.description.trim() || undefined,
        };
        if (editingId) {
          const { school_id: _s, ...upd } = payload;
          await routesApi.update(editingId, upd, schoolId);
        } else {
          await routesApi.create(payload);
        }
        setRoutePage(1);
        await loadRoutes();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save route failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadRoutes],
  );

  const removeRoute = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await routesApi.softDelete(id, schoolId);
        await loadRoutes();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadRoutes],
  );

  const saveAssignment = useCallback(
    async (form: AssignmentForm, editingId?: number) => {
      if (!form.studentId.trim() || !form.routeId.trim()) {
        setError('Student and Route are required');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const payload = {
          school_id: schoolId,
          student_id: Number(form.studentId),
          route_id: Number(form.routeId),
          pickup_stop: form.pickupStop.trim() || undefined,
          drop_stop: form.dropStop.trim() || undefined,
          start_date: form.startDate.trim() || undefined,
          end_date: form.endDate.trim() || undefined,
        };
        if (editingId) {
          const { school_id: _s, student_id: _st, ...upd } = payload;
          await transportAssignmentsApi.update(editingId, upd, schoolId);
        } else {
          await transportAssignmentsApi.create(payload);
        }
        setAssignmentPage(1);
        await loadAssignments();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Save assignment failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadAssignments],
  );

  const removeAssignment = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await transportAssignmentsApi.softDelete(id, schoolId);
        await loadAssignments();
        return true;
      } catch (e) {
        setError(extractErrorMessage(e, 'Deactivate failed'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [schoolId, loadAssignments],
  );

  const vehiclePages = Math.max(1, Math.ceil(vehicleTotal / PER_PAGE));
  const routePages = Math.max(1, Math.ceil(routeTotal / PER_PAGE));
  const assignmentPages = Math.max(1, Math.ceil(assignmentTotal / PER_PAGE));

  return useMemo(
    () => ({
      status,
      error,
      busy,
      vehicles,
      routes,
      assignments,
      vehicleTotal,
      routeTotal,
      assignmentTotal,
      vehiclePage,
      routePage,
      assignmentPage,
      vehiclePages,
      routePages,
      assignmentPages,
      vehicleQuery,
      setVehicleSearch,
      setVehiclePage,
      setRoutePage,
      setAssignmentPage,
      loadVehicles,
      loadRoutes,
      loadAssignments,
      saveVehicle,
      removeVehicle,
      saveRoute,
      removeRoute,
      saveAssignment,
      removeAssignment,
      refetch,
    }),
    [
      status,
      error,
      busy,
      vehicles,
      routes,
      assignments,
      vehicleTotal,
      routeTotal,
      assignmentTotal,
      vehiclePage,
      routePage,
      assignmentPage,
      vehiclePages,
      routePages,
      assignmentPages,
      vehicleQuery,
      setVehicleSearch,
      loadVehicles,
      loadRoutes,
      loadAssignments,
      saveVehicle,
      removeVehicle,
      saveRoute,
      removeRoute,
      saveAssignment,
      removeAssignment,
      refetch,
    ],
  );
}
