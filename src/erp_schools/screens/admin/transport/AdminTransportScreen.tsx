/**
 * Admin Transport Management hub — web TransportTab parity.
 * Tabs: Vehicles | Routes | Assignments
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  Badge,
  EmptyState,
  PrimaryButton,
  FormField,
  TextField,
  SelectField,
  SearchBar,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import {
  useAdminTransportData,
  VEHICLE_STATUSES,
  type AdminTransportTab,
  type VehicleRow,
  type RouteRow,
  type AssignmentRow,
} from '../../../hooks/useAdminTransportData';

const TRANSPORT_TABS: Array<{
  key: AdminTransportTab;
  title: string;
  subtitle: string;
}> = [
  {
    key: 'vehicles',
    title: 'Vehicles',
    subtitle: 'Fleet registry, drivers, and maintenance status.',
  },
  {
    key: 'routes',
    title: 'Routes',
    subtitle: 'Route planning, stops, and monthly fees.',
  },
  {
    key: 'assignments',
    title: 'Assignments',
    subtitle: 'Student pickup and drop assignments.',
  },
];

const currency = (n: number) =>
  n > 0 ? `₹${Math.round(n).toLocaleString('en-IN')}` : '—';

function vehicleStatusAccent(
  s: string,
): 'green' | 'orange' | 'teal' | 'blue' | 'purple' | 'red' {
  const v = s.toLowerCase();
  if (v === 'active') return 'green';
  if (v === 'maintenance') return 'orange';
  if (v === 'retired') return 'teal';
  return 'purple';
}

function CompactBtn({
  label,
  onPress,
  outline,
  icon,
}: {
  label: string;
  onPress: () => void;
  outline?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const theme = useTeacherTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.compactBtn,
        {
          backgroundColor: outline ? theme.colors.surface : theme.colors.primary,
          borderColor: theme.colors.primary,
        },
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={16}
          color={outline ? theme.colors.primary : theme.colors.textInverse}
        />
      ) : null}
      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: outline ? theme.colors.primary : theme.colors.textInverse,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PaginationRow({
  page,
  totalPages,
  total,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const theme = useTeacherTheme();
  if (totalPages <= 1) return null;
  return (
    <View style={styles.row}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, flex: 1 }}>
        Page {page} of {totalPages} · {total} total
      </Text>
      <CompactBtn
        label="Prev"
        outline
        onPress={onPrev}
        icon="chevron-back"
      />
      <CompactBtn
        label="Next"
        outline
        onPress={onNext}
        icon="chevron-forward"
      />
    </View>
  );
}

type Props = {
  initialTab?: AdminTransportTab;
};

export default function AdminTransportScreen({ initialTab = 'vehicles' }: Props) {
  const theme = useTeacherTheme();
  const tx = useAdminTransportData();
  const [tab, setTab] = useState<AdminTransportTab>(initialTab);

  const [vehicleModal, setVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleRow | null>(null);
  const [vehicleForm, setVehicleForm] = useState({
    vehicleNumber: '',
    vehicleType: 'bus',
    capacity: '40',
    driverName: '',
    driverPhone: '',
    insuranceExpiry: '',
    fitnessExpiry: '',
    status: 'active',
  });

  const [routeModal, setRouteModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteRow | null>(null);
  const [routeForm, setRouteForm] = useState({
    routeName: '',
    startPoint: '',
    endPoint: '',
    distanceKm: '',
    vehicleId: '',
    monthlyFee: '0',
    stopsText: '[]',
    description: '',
  });

  const [assignModal, setAssignModal] = useState(false);
  const [editingAssign, setEditingAssign] = useState<AssignmentRow | null>(null);
  const [assignForm, setAssignForm] = useState({
    studentId: '',
    routeId: '',
    pickupStop: '',
    dropStop: '',
    startDate: '',
    endDate: '',
  });

  const statusOpts = useMemo(
    () => VEHICLE_STATUSES.map((s) => ({ label: s, value: s })),
    [],
  );

  const openVehicleCreate = () => {
    setEditingVehicle(null);
    setVehicleForm({
      vehicleNumber: '',
      vehicleType: 'bus',
      capacity: '40',
      driverName: '',
      driverPhone: '',
      insuranceExpiry: '',
      fitnessExpiry: '',
      status: 'active',
    });
    setVehicleModal(true);
  };

  const openRouteCreate = () => {
    setEditingRoute(null);
    setRouteForm({
      routeName: '',
      startPoint: '',
      endPoint: '',
      distanceKm: '',
      vehicleId: '',
      monthlyFee: '0',
      stopsText: '[]',
      description: '',
    });
    setRouteModal(true);
  };

  const openAssignCreate = () => {
    setEditingAssign(null);
    setAssignForm({
      studentId: '',
      routeId: '',
      pickupStop: '',
      dropStop: '',
      startDate: '',
      endDate: '',
    });
    setAssignModal(true);
  };

  const confirmDeactivate = (label: string, onConfirm: () => void) => {
    Alert.alert('Deactivate?', label, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: onConfirm },
    ]);
  };

  return (
    <TeacherScreen
      header={
        <ScreenHeader
          title="Transport Management"
          trailingIcon="refresh-outline"
          onTrailingPress={() => void tx.refetch()}
        />
      }
      contentStyle={styles.content}
    >
      {tx.status === 'loading' ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 12 }} />
      ) : null}
      {tx.error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{tx.error}</Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRail}
      >
        {TRANSPORT_TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              activeOpacity={0.88}
              style={[
                styles.tabCard,
                theme.shadow.light,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabTitle,
                  { color: active ? theme.colors.textInverse : theme.colors.textPrimary },
                ]}
                numberOfLines={1}
              >
                {t.title}
              </Text>
              <Text
                style={[
                  styles.tabSub,
                  {
                    color: active ? 'rgba(255,255,255,0.82)' : theme.colors.textSecondary,
                  },
                ]}
                numberOfLines={2}
              >
                {t.subtitle}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Vehicles */}
      {tab === 'vehicles' ? (
        <View style={styles.section}>
          <SearchBar
            value={tx.vehicleQuery}
            onChangeText={tx.setVehicleSearch}
            placeholder="Search vehicles…"
          />
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {tx.vehicleTotal} vehicle{tx.vehicleTotal === 1 ? '' : 's'}
            </Text>
            <CompactBtn
              label="Refresh"
              outline
              icon="refresh"
              onPress={() => void tx.loadVehicles()}
            />
            <CompactBtn label="Add Vehicle" icon="add" onPress={openVehicleCreate} />
          </View>
          {tx.vehicles.length === 0 ? (
            <EmptyState
              icon="bus-outline"
              title="No vehicles"
              message="Add a fleet vehicle to get started."
            />
          ) : (
            tx.vehicles.map((v) => (
              <SurfaceCard key={v.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {v.vehicleNumber}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      ID {v.id} · {v.vehicleType || '—'} · Cap {v.capacity || '—'}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      Driver: {v.driverName || '—'}
                      {v.driverPhone ? ` · ${v.driverPhone}` : ''}
                    </Text>
                  </View>
                  <Badge label={v.status} accent={vehicleStatusAccent(v.status)} />
                </View>
                <View style={styles.row}>
                  <CompactBtn
                    label="Edit"
                    outline
                    onPress={() => {
                      setEditingVehicle(v);
                      setVehicleForm({
                        vehicleNumber: v.vehicleNumber,
                        vehicleType: v.vehicleType || 'bus',
                        capacity: String(v.capacity || 40),
                        driverName: v.driverName,
                        driverPhone: v.driverPhone,
                        insuranceExpiry: v.insuranceExpiry,
                        fitnessExpiry: v.fitnessExpiry,
                        status: v.status || 'active',
                      });
                      setVehicleModal(true);
                    }}
                  />
                  {v.isActive ? (
                    <CompactBtn
                      label="Deactivate"
                      outline
                      onPress={() =>
                        confirmDeactivate(v.vehicleNumber, () =>
                          void tx.removeVehicle(v.id),
                        )
                      }
                    />
                  ) : null}
                </View>
              </SurfaceCard>
            ))
          )}
          <PaginationRow
            page={tx.vehiclePage}
            totalPages={tx.vehiclePages}
            total={tx.vehicleTotal}
            onPrev={() => tx.setVehiclePage(Math.max(1, tx.vehiclePage - 1))}
            onNext={() =>
              tx.setVehiclePage(Math.min(tx.vehiclePages, tx.vehiclePage + 1))
            }
          />
        </View>
      ) : null}

      {/* Routes */}
      {tab === 'routes' ? (
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {tx.routeTotal} route{tx.routeTotal === 1 ? '' : 's'}
            </Text>
            <CompactBtn
              label="Refresh"
              outline
              icon="refresh"
              onPress={() => void tx.loadRoutes()}
            />
            <CompactBtn label="New Route" icon="add" onPress={openRouteCreate} />
          </View>
          {tx.routes.length === 0 ? (
            <EmptyState
              icon="map-outline"
              title="No routes"
              message="Create a transport route with stops and monthly fee."
            />
          ) : (
            tx.routes.map((r) => (
              <SurfaceCard key={r.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {r.routeName}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      ID {r.id} · {r.startPoint || '—'} → {r.endPoint || '—'}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      {r.distanceKm != null ? `${r.distanceKm} km` : '—'} · Fee/mo{' '}
                      {currency(r.monthlyFee)} · Vehicle {r.vehicleId ?? '—'}
                    </Text>
                  </View>
                </View>
                <View style={styles.row}>
                  <CompactBtn
                    label="Edit"
                    outline
                    onPress={() => {
                      setEditingRoute(r);
                      setRouteForm({
                        routeName: r.routeName,
                        startPoint: r.startPoint,
                        endPoint: r.endPoint,
                        distanceKm: r.distanceKm != null ? String(r.distanceKm) : '',
                        vehicleId: r.vehicleId != null ? String(r.vehicleId) : '',
                        monthlyFee: String(r.monthlyFee || 0),
                        stopsText: JSON.stringify(r.stops || [], null, 2),
                        description: r.description,
                      });
                      setRouteModal(true);
                    }}
                  />
                  {r.isActive ? (
                    <CompactBtn
                      label="Deactivate"
                      outline
                      onPress={() =>
                        confirmDeactivate(r.routeName, () => void tx.removeRoute(r.id))
                      }
                    />
                  ) : null}
                </View>
              </SurfaceCard>
            ))
          )}
          <PaginationRow
            page={tx.routePage}
            totalPages={tx.routePages}
            total={tx.routeTotal}
            onPrev={() => tx.setRoutePage(Math.max(1, tx.routePage - 1))}
            onNext={() => tx.setRoutePage(Math.min(tx.routePages, tx.routePage + 1))}
          />
        </View>
      ) : null}

      {/* Assignments */}
      {tab === 'assignments' ? (
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {tx.assignmentTotal} assignment{tx.assignmentTotal === 1 ? '' : 's'}
            </Text>
            <CompactBtn
              label="Refresh"
              outline
              icon="refresh"
              onPress={() => void tx.loadAssignments()}
            />
            <CompactBtn label="Assign Student" icon="add" onPress={openAssignCreate} />
          </View>
          {tx.assignments.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="No assignments"
              message="Assign a student to a transport route."
            />
          ) : (
            tx.assignments.map((a) => (
              <SurfaceCard key={a.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      Student #{a.studentId}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      ID {a.id} · Route #{a.routeId}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      Pickup: {a.pickupStop || '—'} · Drop: {a.dropStop || '—'}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      {a.startDate || '—'} → {a.endDate || '—'}
                    </Text>
                  </View>
                </View>
                <View style={styles.row}>
                  <CompactBtn
                    label="Edit"
                    outline
                    onPress={() => {
                      setEditingAssign(a);
                      setAssignForm({
                        studentId: String(a.studentId),
                        routeId: String(a.routeId),
                        pickupStop: a.pickupStop,
                        dropStop: a.dropStop,
                        startDate: a.startDate,
                        endDate: a.endDate,
                      });
                      setAssignModal(true);
                    }}
                  />
                  {a.isActive ? (
                    <CompactBtn
                      label="Deactivate"
                      outline
                      onPress={() =>
                        confirmDeactivate(`Assignment #${a.id}`, () =>
                          void tx.removeAssignment(a.id),
                        )
                      }
                    />
                  ) : null}
                </View>
              </SurfaceCard>
            ))
          )}
          <PaginationRow
            page={tx.assignmentPage}
            totalPages={tx.assignmentPages}
            total={tx.assignmentTotal}
            onPrev={() =>
              tx.setAssignmentPage(Math.max(1, tx.assignmentPage - 1))
            }
            onNext={() =>
              tx.setAssignmentPage(
                Math.min(tx.assignmentPages, tx.assignmentPage + 1),
              )
            }
          />
        </View>
      ) : null}

      {/* Vehicle modal */}
      <Modal visible={vehicleModal} animationType="slide" onRequestClose={() => setVehicleModal(false)}>
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
            </Text>
            <TouchableOpacity onPress={() => setVehicleModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="Vehicle Number" required>
              <TextField
                value={vehicleForm.vehicleNumber}
                onChangeText={(t) => setVehicleForm((f) => ({ ...f, vehicleNumber: t }))}
                placeholder="e.g. TG01AB1234"
              />
            </FormField>
            <FormField label="Type">
              <TextField
                value={vehicleForm.vehicleType}
                onChangeText={(t) => setVehicleForm((f) => ({ ...f, vehicleType: t }))}
                placeholder="bus"
              />
            </FormField>
            <FormField label="Capacity">
              <TextField
                value={vehicleForm.capacity}
                onChangeText={(t) => setVehicleForm((f) => ({ ...f, capacity: t }))}
                keyboardType="number-pad"
              />
            </FormField>
            <FormField label="Driver Name">
              <TextField
                value={vehicleForm.driverName}
                onChangeText={(t) => setVehicleForm((f) => ({ ...f, driverName: t }))}
              />
            </FormField>
            <FormField label="Driver Phone">
              <TextField
                value={vehicleForm.driverPhone}
                onChangeText={(t) => setVehicleForm((f) => ({ ...f, driverPhone: t }))}
                keyboardType="phone-pad"
              />
            </FormField>
            <FormField label="Insurance Expiry">
              <TextField
                value={vehicleForm.insuranceExpiry}
                onChangeText={(t) => setVehicleForm((f) => ({ ...f, insuranceExpiry: t }))}
                placeholder="YYYY-MM-DD"
              />
            </FormField>
            <FormField label="Fitness Expiry">
              <TextField
                value={vehicleForm.fitnessExpiry}
                onChangeText={(t) => setVehicleForm((f) => ({ ...f, fitnessExpiry: t }))}
                placeholder="YYYY-MM-DD"
              />
            </FormField>
            <FormField label="Status">
              <SelectField
                value={vehicleForm.status}
                onChange={(v) => setVehicleForm((f) => ({ ...f, status: v }))}
                options={statusOpts}
              />
            </FormField>
            <PrimaryButton
              label={tx.busy ? 'Saving…' : 'Save'}
              disabled={tx.busy}
              onPress={() => {
                void (async () => {
                  const ok = await tx.saveVehicle(
                    {
                      vehicleNumber: vehicleForm.vehicleNumber,
                      vehicleType: vehicleForm.vehicleType,
                      capacity: Number(vehicleForm.capacity) || 40,
                      driverName: vehicleForm.driverName,
                      driverPhone: vehicleForm.driverPhone,
                      insuranceExpiry: vehicleForm.insuranceExpiry,
                      fitnessExpiry: vehicleForm.fitnessExpiry,
                      status: vehicleForm.status,
                    },
                    editingVehicle?.id,
                  );
                  if (ok) setVehicleModal(false);
                  else Alert.alert('Save failed', tx.error || 'Could not save');
                })();
              }}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Route modal */}
      <Modal visible={routeModal} animationType="slide" onRequestClose={() => setRouteModal(false)}>
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingRoute ? 'Edit Route' : 'New Route'}
            </Text>
            <TouchableOpacity onPress={() => setRouteModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="Route Name" required>
              <TextField
                value={routeForm.routeName}
                onChangeText={(t) => setRouteForm((f) => ({ ...f, routeName: t }))}
              />
            </FormField>
            <FormField label="Start Point">
              <TextField
                value={routeForm.startPoint}
                onChangeText={(t) => setRouteForm((f) => ({ ...f, startPoint: t }))}
              />
            </FormField>
            <FormField label="End Point">
              <TextField
                value={routeForm.endPoint}
                onChangeText={(t) => setRouteForm((f) => ({ ...f, endPoint: t }))}
              />
            </FormField>
            <FormField label="Distance (km)">
              <TextField
                value={routeForm.distanceKm}
                onChangeText={(t) => setRouteForm((f) => ({ ...f, distanceKm: t }))}
                keyboardType="decimal-pad"
              />
            </FormField>
            <FormField label="Vehicle ID">
              <TextField
                value={routeForm.vehicleId}
                onChangeText={(t) => setRouteForm((f) => ({ ...f, vehicleId: t }))}
                keyboardType="number-pad"
              />
            </FormField>
            <FormField label="Monthly Fee">
              <TextField
                value={routeForm.monthlyFee}
                onChangeText={(t) => setRouteForm((f) => ({ ...f, monthlyFee: t }))}
                keyboardType="decimal-pad"
              />
            </FormField>
            <FormField label="Stops (JSON array)">
              <TextField
                value={routeForm.stopsText}
                onChangeText={(t) => setRouteForm((f) => ({ ...f, stopsText: t }))}
                multiline
              />
            </FormField>
            <FormField label="Description">
              <TextField
                value={routeForm.description}
                onChangeText={(t) => setRouteForm((f) => ({ ...f, description: t }))}
                multiline
              />
            </FormField>
            <PrimaryButton
              label={tx.busy ? 'Saving…' : 'Save'}
              disabled={tx.busy}
              onPress={() => {
                void (async () => {
                  const ok = await tx.saveRoute(
                    {
                      routeName: routeForm.routeName,
                      startPoint: routeForm.startPoint,
                      endPoint: routeForm.endPoint,
                      distanceKm: routeForm.distanceKm,
                      vehicleId: routeForm.vehicleId,
                      monthlyFee: Number(routeForm.monthlyFee) || 0,
                      stopsText: routeForm.stopsText,
                      description: routeForm.description,
                    },
                    editingRoute?.id,
                  );
                  if (ok) setRouteModal(false);
                  else Alert.alert('Save failed', tx.error || 'Could not save');
                })();
              }}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Assignment modal */}
      <Modal visible={assignModal} animationType="slide" onRequestClose={() => setAssignModal(false)}>
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingAssign ? 'Edit Assignment' : 'Assign Student to Route'}
            </Text>
            <TouchableOpacity onPress={() => setAssignModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="Student ID" required>
              <TextField
                value={assignForm.studentId}
                onChangeText={(t) => setAssignForm((f) => ({ ...f, studentId: t }))}
                keyboardType="number-pad"
                editable={!editingAssign}
              />
            </FormField>
            <FormField label="Route ID" required>
              <TextField
                value={assignForm.routeId}
                onChangeText={(t) => setAssignForm((f) => ({ ...f, routeId: t }))}
                keyboardType="number-pad"
              />
            </FormField>
            <FormField label="Pickup Stop">
              <TextField
                value={assignForm.pickupStop}
                onChangeText={(t) => setAssignForm((f) => ({ ...f, pickupStop: t }))}
              />
            </FormField>
            <FormField label="Drop Stop">
              <TextField
                value={assignForm.dropStop}
                onChangeText={(t) => setAssignForm((f) => ({ ...f, dropStop: t }))}
              />
            </FormField>
            <FormField label="Start Date">
              <TextField
                value={assignForm.startDate}
                onChangeText={(t) => setAssignForm((f) => ({ ...f, startDate: t }))}
                placeholder="YYYY-MM-DD"
              />
            </FormField>
            <FormField label="End Date">
              <TextField
                value={assignForm.endDate}
                onChangeText={(t) => setAssignForm((f) => ({ ...f, endDate: t }))}
                placeholder="YYYY-MM-DD"
              />
            </FormField>
            <PrimaryButton
              label={tx.busy ? 'Saving…' : 'Save'}
              disabled={tx.busy}
              onPress={() => {
                void (async () => {
                  const ok = await tx.saveAssignment(
                    {
                      studentId: assignForm.studentId,
                      routeId: assignForm.routeId,
                      pickupStop: assignForm.pickupStop,
                      dropStop: assignForm.dropStop,
                      startDate: assignForm.startDate,
                      endDate: assignForm.endDate,
                    },
                    editingAssign?.id,
                  );
                  if (ok) setAssignModal(false);
                  else Alert.alert('Save failed', tx.error || 'Could not save');
                })();
              }}
            />
          </ScrollView>
        </View>
      </Modal>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14, paddingBottom: 32 },
  tabRail: { gap: 10, paddingRight: 8, paddingVertical: 2 },
  tabCard: {
    width: 168,
    minHeight: 78,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  tabTitle: { fontSize: 14, fontWeight: '700' },
  tabSub: { fontSize: 11, lineHeight: 15, marginTop: 4 },
  section: { gap: 12 },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  listRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  rowName: { fontSize: 15, fontWeight: '700' },
  compactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  modalRoot: { flex: 1, paddingTop: 48 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalBody: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
});
