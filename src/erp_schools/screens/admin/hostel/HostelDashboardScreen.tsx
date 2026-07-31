/**
 * Hostel Management hub — web HostelTab parity.
 * Tabs: Rooms | Allocations | Complaints
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
  FilterChips,
  Badge,
  EmptyState,
  PrimaryButton,
  FormField,
  TextField,
  SelectField,
  StatGrid,
  type ChipOption,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import {
  useAdminHostelData,
  type AdminHostelTab,
  type HostelRoomRow,
  type HostelAllocationRow,
  type HostelComplaintRow,
} from '../../../hooks/useAdminHostelData';
import {
  ROOM_TYPES,
  ROOM_STATUSES,
  COMPLAINT_TYPES,
  COMPLAINT_PRIORITIES,
  COMPLAINT_STATUSES,
  enumLabel,
  formatRent,
} from '../../../utils/hostelMeta';
import { toLocalDateStr } from '../../../utils/apiHelpers';

const HOSTEL_TABS: Array<{ key: AdminHostelTab; title: string; subtitle: string }> = [
  {
    key: 'rooms',
    title: 'Rooms',
    subtitle: 'Room inventory, capacity, and rent details.',
  },
  {
    key: 'allocations',
    title: 'Allocations',
    subtitle: 'Student room and bed assignments.',
  },
  {
    key: 'complaints',
    title: 'Complaints',
    subtitle: 'Track and resolve hostel complaints.',
  },
];

function statusAccent(s: string): 'green' | 'red' | 'orange' | 'blue' | 'purple' | 'teal' {
  const v = s.toLowerCase();
  if (v === 'available' || v === 'active' || v === 'resolved') return 'green';
  if (v === 'full' || v === 'medium') return 'purple';
  if (v === 'maintenance' || v === 'high' || v === 'in_progress' || v === 'open') return 'orange';
  if (v === 'critical' || v === 'rejected') return 'red';
  if (v === 'closed' || v === 'inactive') return 'teal';
  return 'blue';
}

function CompactBtn({
  label,
  onPress,
  outline,
  icon,
  danger,
}: {
  label: string;
  onPress: () => void;
  outline?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  danger?: boolean;
}) {
  const theme = useTeacherTheme();
  const border = danger ? theme.colors.danger : theme.colors.primary;
  const bg = outline ? theme.colors.surface : danger ? theme.colors.danger : theme.colors.primary;
  const fg = outline ? border : theme.colors.textInverse;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.compactBtn, { backgroundColor: bg, borderColor: border }]}
    >
      {icon ? <Ionicons name={icon} size={16} color={fg} /> : null}
      <Text style={{ fontSize: 13, fontWeight: '700', color: fg }}>{label}</Text>
    </TouchableOpacity>
  );
}

function PageRow({
  page,
  pages,
  total,
  onPrev,
  onNext,
}: {
  page: number;
  pages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const theme = useTeacherTheme();
  if (total <= 0) return null;
  return (
    <View style={styles.pageRow}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, flex: 1 }}>
        Page {page} / {pages} · {total} total
      </Text>
      <CompactBtn
        label="Prev"
        outline
        onPress={onPrev}
      />
      <CompactBtn
        label="Next"
        outline
        onPress={onNext}
      />
    </View>
  );
}

export default function HostelDashboardScreen() {
  const theme = useTeacherTheme();
  const hostel = useAdminHostelData();
  const [tab, setTab] = useState<AdminHostelTab>('rooms');

  const [roomModal, setRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<HostelRoomRow | null>(null);
  const [roomForm, setRoomForm] = useState({
    block: '',
    roomNumber: '',
    floor: '1',
    roomType: 'double',
    capacity: '2',
    monthlyRent: '0',
    status: 'available',
    facilitiesText: '',
  });

  const [allocModal, setAllocModal] = useState(false);
  const [editingAlloc, setEditingAlloc] = useState<HostelAllocationRow | null>(null);
  const [allocForm, setAllocForm] = useState({
    studentId: '',
    roomId: '',
    bedNumber: '',
    allotDate: toLocalDateStr(),
    vacateDate: '',
  });

  const [complaintModal, setComplaintModal] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState<HostelComplaintRow | null>(null);
  const [complaintForm, setComplaintForm] = useState({
    subject: '',
    studentId: '',
    roomId: '',
    complaintType: 'general',
    priority: 'medium',
    status: 'open',
    description: '',
    resolutionNote: '',
  });

  const complaintChips: ChipOption[] = useMemo(
    () => COMPLAINT_STATUSES.map((s) => ({ key: s, label: enumLabel(s) })),
    [],
  );

  const studentOpts = hostel.students.map((s) => ({
    label: s.label,
    value: String(s.userId),
  }));

  const roomSelectOpts = useMemo(() => {
    const list = hostel.availableRoomsForForm(editingAlloc?.roomId ?? null);
    return list.map((r) => ({
      label: `${r.displayName} (${r.occupied}/${r.capacity} · ${r.roomType})`,
      value: String(r.id),
    }));
  }, [hostel.availableRoomsForForm, editingAlloc?.roomId]);

  const allRoomOpts = hostel.roomOptions.map((r) => ({
    label: r.displayName,
    value: String(r.id),
  }));

  const openRoomCreate = () => {
    setEditingRoom(null);
    setRoomForm({
      block: '',
      roomNumber: '',
      floor: '1',
      roomType: 'double',
      capacity: '2',
      monthlyRent: '0',
      status: 'available',
      facilitiesText: '',
    });
    setRoomModal(true);
  };

  const openRoomEdit = (item: HostelRoomRow) => {
    setEditingRoom(item);
    setRoomForm({
      block: item.block,
      roomNumber: item.roomNumber,
      floor: String(item.floor ?? 1),
      roomType: item.roomType || 'double',
      capacity: String(item.capacity ?? 2),
      monthlyRent: String(item.monthlyRent ?? 0),
      status: item.status || 'available',
      facilitiesText: item.facilities?.length ? JSON.stringify(item.facilities) : '',
    });
    setRoomModal(true);
  };

  const openAllocCreate = () => {
    setEditingAlloc(null);
    setAllocForm({
      studentId: '',
      roomId: '',
      bedNumber: '',
      allotDate: toLocalDateStr(),
      vacateDate: '',
    });
    setAllocModal(true);
  };

  const openAllocEdit = (item: HostelAllocationRow) => {
    setEditingAlloc(item);
    setAllocForm({
      studentId: String(item.studentId),
      roomId: String(item.roomId),
      bedNumber: item.bedNumber,
      allotDate: item.allotDate,
      vacateDate: item.vacateDate,
    });
    setAllocModal(true);
  };

  const openComplaintCreate = () => {
    setEditingComplaint(null);
    setComplaintForm({
      subject: '',
      studentId: '',
      roomId: '',
      complaintType: 'general',
      priority: 'medium',
      status: 'open',
      description: '',
      resolutionNote: '',
    });
    setComplaintModal(true);
  };

  const openComplaintEdit = (item: HostelComplaintRow) => {
    setEditingComplaint(item);
    setComplaintForm({
      subject: item.subject,
      studentId: String(item.studentId || ''),
      roomId: item.roomId != null ? String(item.roomId) : '',
      complaintType: item.complaintType || 'general',
      priority: item.priority || 'medium',
      status: item.status || 'open',
      description: item.description,
      resolutionNote: item.resolutionNote,
    });
    setComplaintModal(true);
  };

  const confirmDeactivate = (label: string, onOk: () => void) => {
    Alert.alert('Deactivate?', `Deactivate this ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: onOk },
    ]);
  };

  const kpiItems = [
    {
      key: 'rooms',
      label: 'Rooms',
      value: String(hostel.kpis.totalRooms),
      icon: 'bed-outline' as const,
      accent: 'teal' as const,
    },
    {
      key: 'occ',
      label: 'Occupied',
      value: String(hostel.kpis.occupiedBeds),
      icon: 'people-outline' as const,
      accent: 'green' as const,
    },
    {
      key: 'avail',
      label: 'Available',
      value: String(hostel.kpis.availableBeds),
      icon: 'checkmark-circle-outline' as const,
      accent: 'blue' as const,
    },
    {
      key: 'pct',
      label: 'Occupancy',
      value: `${hostel.kpis.occupancyPct}%`,
      icon: 'pie-chart-outline' as const,
      accent: 'orange' as const,
    },
  ];

  return (
    <TeacherScreen
      header={
        <ScreenHeader
          title="Hostel Management"
          trailingIcon="refresh-outline"
          onTrailingPress={() => void hostel.refetch()}
        />
      }
      contentStyle={styles.content}
    >
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginBottom: 2 }}>
        Manage rooms, student allocations, and hostel complaints.
      </Text>

      <StatGrid items={kpiItems} columns={2} variant="tinted" />

      {hostel.status === 'loading' ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 12 }} />
      ) : null}
      {hostel.error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{hostel.error}</Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRail}
      >
        {HOSTEL_TABS.map((t) => {
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

      {/* Rooms */}
      {tab === 'rooms' ? (
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {hostel.roomTotal} room{hostel.roomTotal === 1 ? '' : 's'}
            </Text>
            <CompactBtn
              label="Refresh"
              outline
              icon="refresh"
              onPress={() => void hostel.loadRooms()}
            />
            {hostel.canManage ? (
              <CompactBtn label="Add Room" icon="add" onPress={openRoomCreate} />
            ) : null}
          </View>
          {hostel.rooms.length === 0 ? (
            <EmptyState
              icon="bed-outline"
              title="No rooms"
              message="Add hostel rooms to start allocations."
            />
          ) : (
            hostel.rooms.map((item) => (
              <SurfaceCard key={item.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {item.displayName}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      ID {item.id} · {item.roomType} · Cap {item.occupied}/{item.capacity} ·{' '}
                      {formatRent(item.monthlyRent)}
                    </Text>
                    <View style={styles.row}>
                      <Badge label={item.status} accent={statusAccent(item.status)} />
                      {!item.isActive ? <Badge label="inactive" accent="red" /> : null}
                    </View>
                  </View>
                  {hostel.canManage ? (
                    <View style={{ gap: 6 }}>
                      <CompactBtn label="Edit" outline onPress={() => openRoomEdit(item)} />
                      {item.isActive ? (
                        <CompactBtn
                          label="Deactivate"
                          outline
                          danger
                          onPress={() =>
                            confirmDeactivate('room', () => {
                              void hostel.removeRoom(item.id);
                            })
                          }
                        />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </SurfaceCard>
            ))
          )}
          <PageRow
            page={hostel.roomPage}
            pages={hostel.roomPages}
            total={hostel.roomTotal}
            onPrev={() => hostel.setRoomPage(Math.max(1, hostel.roomPage - 1))}
            onNext={() =>
              hostel.setRoomPage(Math.min(hostel.roomPages, hostel.roomPage + 1))
            }
          />
        </View>
      ) : null}

      {/* Allocations */}
      {tab === 'allocations' ? (
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {hostel.allocationTotal} allocation{hostel.allocationTotal === 1 ? '' : 's'}
            </Text>
            {hostel.canManage ? (
              <CompactBtn label="Allocate Student" icon="add" onPress={openAllocCreate} />
            ) : null}
          </View>
          {hostel.allocations.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="No allocations"
              message="Allocate students to available rooms."
            />
          ) : (
            hostel.allocations.map((item) => (
              <SurfaceCard key={item.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {item.studentLabel}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      ID {item.id} · {item.roomLabel}
                      {item.bedNumber ? ` · Bed ${item.bedNumber}` : ''}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      From {item.allotDate || '—'} · To {item.vacateDate || '—'}
                    </Text>
                    <View style={styles.row}>
                      <Badge label={item.status || '—'} accent={statusAccent(item.status)} />
                    </View>
                  </View>
                  {hostel.canManage ? (
                    <View style={{ gap: 6 }}>
                      <CompactBtn label="Edit" outline onPress={() => openAllocEdit(item)} />
                      {item.isActive ? (
                        <CompactBtn
                          label="Deactivate"
                          outline
                          danger
                          onPress={() =>
                            confirmDeactivate('allocation', () => {
                              void hostel.removeAllocation(item.id);
                            })
                          }
                        />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </SurfaceCard>
            ))
          )}
          <PageRow
            page={hostel.allocationPage}
            pages={hostel.allocationPages}
            total={hostel.allocationTotal}
            onPrev={() => hostel.setAllocationPage(Math.max(1, hostel.allocationPage - 1))}
            onNext={() =>
              hostel.setAllocationPage(
                Math.min(hostel.allocationPages, hostel.allocationPage + 1),
              )
            }
          />
        </View>
      ) : null}

      {/* Complaints */}
      {tab === 'complaints' ? (
        <View style={styles.section}>
          <FilterChips
            size="sm"
            options={complaintChips}
            activeKey={hostel.complaintStatusFilter}
            onChange={(key) => hostel.setComplaintFilter(key)}
          />
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {hostel.complaintTotal} complaint{hostel.complaintTotal === 1 ? '' : 's'}
            </Text>
            {hostel.canManage || hostel.isStudent ? (
              <CompactBtn label="New Complaint" icon="add" onPress={openComplaintCreate} />
            ) : null}
          </View>
          {hostel.complaints.length === 0 ? (
            <EmptyState
              icon="chatbubble-ellipses-outline"
              title="No complaints"
              message="Hostel complaints will appear here."
            />
          ) : (
            hostel.complaints.map((item) => (
              <SurfaceCard key={item.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {item.subject}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      ID {item.id} · {item.roomLabel} · {item.createdAt || '—'}
                    </Text>
                    <View style={styles.row}>
                      <Badge label={item.priority} accent={statusAccent(item.priority)} />
                      <Badge
                        label={enumLabel(item.status)}
                        accent={statusAccent(item.status)}
                      />
                    </View>
                  </View>
                  {hostel.canManage ? (
                    <View style={{ gap: 6 }}>
                      <CompactBtn
                        label="Edit"
                        outline
                        onPress={() => openComplaintEdit(item)}
                      />
                      {item.isActive ? (
                        <CompactBtn
                          label="Deactivate"
                          outline
                          danger
                          onPress={() =>
                            confirmDeactivate('complaint', () => {
                              void hostel.removeComplaint(item.id);
                            })
                          }
                        />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </SurfaceCard>
            ))
          )}
          <PageRow
            page={hostel.complaintPage}
            pages={hostel.complaintPages}
            total={hostel.complaintTotal}
            onPrev={() => hostel.setComplaintPage(Math.max(1, hostel.complaintPage - 1))}
            onNext={() =>
              hostel.setComplaintPage(
                Math.min(hostel.complaintPages, hostel.complaintPage + 1),
              )
            }
          />
        </View>
      ) : null}

      {/* Room modal */}
      <Modal visible={roomModal} animationType="slide" onRequestClose={() => setRoomModal(false)}>
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingRoom ? 'Edit Room' : 'Add Room'}
            </Text>
            <TouchableOpacity onPress={() => setRoomModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="Block">
              <TextField
                value={roomForm.block}
                onChangeText={(v) => setRoomForm((f) => ({ ...f, block: v }))}
              />
            </FormField>
            <FormField label="Room Number" required>
              <TextField
                value={roomForm.roomNumber}
                onChangeText={(v) => setRoomForm((f) => ({ ...f, roomNumber: v }))}
              />
            </FormField>
            <FormField label="Floor">
              <TextField
                value={roomForm.floor}
                onChangeText={(v) => setRoomForm((f) => ({ ...f, floor: v }))}
                keyboardType="numeric"
              />
            </FormField>
            <FormField label="Room Type">
              <SelectField
                options={ROOM_TYPES.map((t) => ({ label: t, value: t }))}
                value={roomForm.roomType}
                onChange={(v) => setRoomForm((f) => ({ ...f, roomType: v }))}
              />
            </FormField>
            <FormField label="Capacity">
              <TextField
                value={roomForm.capacity}
                onChangeText={(v) => setRoomForm((f) => ({ ...f, capacity: v }))}
                keyboardType="numeric"
              />
            </FormField>
            <FormField label="Rent/Month">
              <TextField
                value={roomForm.monthlyRent}
                onChangeText={(v) => setRoomForm((f) => ({ ...f, monthlyRent: v }))}
                keyboardType="numeric"
              />
            </FormField>
            <FormField label="Status">
              <SelectField
                options={ROOM_STATUSES.map((s) => ({ label: s, value: s }))}
                value={roomForm.status}
                onChange={(v) => setRoomForm((f) => ({ ...f, status: v }))}
              />
            </FormField>
            <FormField label="Facilities (JSON)">
              <TextField
                value={roomForm.facilitiesText}
                onChangeText={(v) => setRoomForm((f) => ({ ...f, facilitiesText: v }))}
                placeholder='e.g., ["WiFi", "AC", "Attached Bathroom"]'
                multiline
              />
            </FormField>
            <PrimaryButton
              label={hostel.busy ? 'Saving…' : 'Save'}
              disabled={hostel.busy}
              onPress={() => {
                if (!roomForm.roomNumber.trim()) {
                  Alert.alert('Required', 'Room number is required');
                  return;
                }
                void (async () => {
                  const ok = await hostel.saveRoom(
                    {
                      block: roomForm.block,
                      roomNumber: roomForm.roomNumber,
                      floor: Number(roomForm.floor || 1),
                      roomType: roomForm.roomType,
                      capacity: Number(roomForm.capacity || 2),
                      monthlyRent: Number(roomForm.monthlyRent || 0),
                      status: roomForm.status,
                      facilitiesText: roomForm.facilitiesText,
                    },
                    editingRoom?.id,
                  );
                  if (ok) setRoomModal(false);
                  else Alert.alert('Save failed', hostel.error || 'Could not save');
                })();
              }}
            />
            <PrimaryButton
              label="Cancel"
              variant="outline"
              onPress={() => setRoomModal(false)}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Allocation modal */}
      <Modal visible={allocModal} animationType="slide" onRequestClose={() => setAllocModal(false)}>
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingAlloc ? 'Edit Allocation' : 'Allocate Student'}
            </Text>
            <TouchableOpacity onPress={() => setAllocModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="Student" required>
              <SelectField
                options={studentOpts}
                value={allocForm.studentId || null}
                onChange={(v) => setAllocForm((f) => ({ ...f, studentId: v }))}
                placeholder="Select student…"
                disabled={editingAlloc != null}
              />
            </FormField>
            {!hostel.academicYearId ? (
              <Text style={{ color: theme.colors.danger, fontSize: 12 }}>
                Select an academic year to load students.
              </Text>
            ) : null}
            {hostel.academicYearId && studentOpts.length === 0 ? (
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                No students found for this academic year.
              </Text>
            ) : null}
            <FormField label="Room" required>
              <SelectField
                options={roomSelectOpts}
                value={allocForm.roomId || null}
                onChange={(v) => setAllocForm((f) => ({ ...f, roomId: v }))}
                placeholder="Select room…"
                disabled={editingAlloc != null}
              />
            </FormField>
            {hostel.roomOptions.length === 0 ? (
              <Text style={{ color: theme.colors.danger, fontSize: 12 }}>
                No rooms found. Add rooms in the Rooms tab first.
              </Text>
            ) : null}
            <FormField label="Bed Number">
              <TextField
                value={allocForm.bedNumber}
                onChangeText={(v) => setAllocForm((f) => ({ ...f, bedNumber: v }))}
              />
            </FormField>
            <FormField label="Allot Date">
              <TextField
                value={allocForm.allotDate}
                onChangeText={(v) => setAllocForm((f) => ({ ...f, allotDate: v }))}
                placeholder="YYYY-MM-DD"
              />
            </FormField>
            <FormField label="Vacate Date">
              <TextField
                value={allocForm.vacateDate}
                onChangeText={(v) => setAllocForm((f) => ({ ...f, vacateDate: v }))}
                placeholder="YYYY-MM-DD"
              />
            </FormField>
            <PrimaryButton
              label={hostel.busy ? 'Saving…' : 'Save'}
              disabled={hostel.busy}
              onPress={() => {
                if (!allocForm.studentId || !allocForm.roomId) {
                  Alert.alert('Required', 'Student and Room are required');
                  return;
                }
                void (async () => {
                  const ok = await hostel.saveAllocation(
                    {
                      studentId: allocForm.studentId,
                      roomId: allocForm.roomId,
                      bedNumber: allocForm.bedNumber,
                      allotDate: allocForm.allotDate,
                      vacateDate: allocForm.vacateDate,
                      status: editingAlloc?.status,
                      remarks: editingAlloc?.remarks,
                      isActive: editingAlloc?.isActive,
                    },
                    editingAlloc?.id,
                  );
                  if (ok) setAllocModal(false);
                  else Alert.alert('Save failed', hostel.error || 'Could not save');
                })();
              }}
            />
            <PrimaryButton
              label="Cancel"
              variant="outline"
              onPress={() => setAllocModal(false)}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Complaint modal */}
      <Modal
        visible={complaintModal}
        animationType="slide"
        onRequestClose={() => setComplaintModal(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingComplaint ? 'Edit Complaint' : 'New Complaint'}
            </Text>
            <TouchableOpacity onPress={() => setComplaintModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="Subject" required>
              <TextField
                value={complaintForm.subject}
                onChangeText={(v) => setComplaintForm((f) => ({ ...f, subject: v }))}
              />
            </FormField>
            {!hostel.isStudent ? (
              <FormField label="Student" required>
                <SelectField
                  options={studentOpts}
                  value={complaintForm.studentId || null}
                  onChange={(v) => setComplaintForm((f) => ({ ...f, studentId: v }))}
                  placeholder="Select student…"
                />
              </FormField>
            ) : null}
            <FormField label="Room">
              <SelectField
                options={allRoomOpts}
                value={complaintForm.roomId || null}
                onChange={(v) => setComplaintForm((f) => ({ ...f, roomId: v }))}
                placeholder="Select room…"
              />
            </FormField>
            <FormField label="Complaint Type">
              <SelectField
                options={COMPLAINT_TYPES.map((t) => ({ label: t, value: t }))}
                value={complaintForm.complaintType}
                onChange={(v) => setComplaintForm((f) => ({ ...f, complaintType: v }))}
              />
            </FormField>
            <FormField label="Priority">
              <SelectField
                options={COMPLAINT_PRIORITIES.map((p) => ({ label: p, value: p }))}
                value={complaintForm.priority}
                onChange={(v) => setComplaintForm((f) => ({ ...f, priority: v }))}
              />
            </FormField>
            <FormField label="Status">
              <SelectField
                options={COMPLAINT_STATUSES.map((s) => ({
                  label: enumLabel(s),
                  value: s,
                }))}
                value={complaintForm.status}
                onChange={(v) => setComplaintForm((f) => ({ ...f, status: v }))}
              />
            </FormField>
            <FormField label="Description">
              <TextField
                value={complaintForm.description}
                onChangeText={(v) => setComplaintForm((f) => ({ ...f, description: v }))}
                multiline
              />
            </FormField>
            <FormField label="Resolution Note">
              <TextField
                value={complaintForm.resolutionNote}
                onChangeText={(v) =>
                  setComplaintForm((f) => ({ ...f, resolutionNote: v }))
                }
                multiline
              />
            </FormField>
            <PrimaryButton
              label={hostel.busy ? 'Saving…' : 'Save'}
              disabled={hostel.busy}
              onPress={() => {
                if (!complaintForm.subject.trim()) {
                  Alert.alert('Required', 'Subject is required');
                  return;
                }
                if (!hostel.isStudent && !complaintForm.studentId && !editingComplaint) {
                  Alert.alert('Required', 'Student is required');
                  return;
                }
                void (async () => {
                  const ok = await hostel.saveComplaint(
                    {
                      subject: complaintForm.subject,
                      studentId: complaintForm.studentId,
                      roomId: complaintForm.roomId,
                      complaintType: complaintForm.complaintType,
                      priority: complaintForm.priority,
                      status: complaintForm.status,
                      description: complaintForm.description,
                      resolutionNote: complaintForm.resolutionNote,
                    },
                    editingComplaint?.id,
                  );
                  if (ok) setComplaintModal(false);
                  else Alert.alert('Save failed', hostel.error || 'Could not save');
                })();
              }}
            />
            <PrimaryButton
              label="Cancel"
              variant="outline"
              onPress={() => setComplaintModal(false)}
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
  pageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
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
