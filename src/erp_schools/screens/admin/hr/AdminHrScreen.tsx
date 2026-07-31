/**
 * Admin HR & Payroll hub — web HRTab leave/payslip parity.
 * Tabs: Leave Types | Leave Applications | Payslips
 * (Staff + Staff Attendance stay on Class Overview / Attendance Dashboard.)
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
  SearchBar,
  type ChipOption,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import {
  useAdminHrData,
  LEAVE_STATUSES,
  PAYSLIP_STATUSES,
  type AdminHrTab,
  type LeaveTypeRow,
  type LeaveAppRow,
  type PayslipRow,
} from '../../../hooks/useAdminHrData';
import { downloadPayslipPdf } from '../../../utils/payslipPdf';
import { toLocalDateStr } from '../../../utils/apiHelpers';

const HR_TABS: Array<{ key: AdminHrTab; title: string; subtitle: string }> = [
  {
    key: 'leave-types',
    title: 'Leave Types',
    subtitle: 'Configure leave policies and allowances.',
  },
  {
    key: 'leave-apps',
    title: 'Leave Applications',
    subtitle: 'Review and approve leave requests.',
  },
  { key: 'payslips', title: 'Payslips', subtitle: 'Generate and view staff payroll.' },
];

const MONTH_OPTS = Array.from({ length: 12 }, (_, i) => ({
  label: new Date(2000, i, 1).toLocaleString('en', { month: 'long' }),
  value: String(i + 1),
}));

const currency = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

function statusAccent(s: string): 'green' | 'red' | 'orange' | 'blue' | 'purple' | 'teal' {
  const v = s.toLowerCase();
  if (v.includes('approve') || v === 'paid') return 'green';
  if (v.includes('reject') || v === 'cancelled') return 'red';
  if (v === 'pending' || v === 'draft') return 'orange';
  if (v === 'generated') return 'blue';
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

function CheckRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  const theme = useTeacherTheme();
  return (
    <TouchableOpacity style={styles.checkRow} onPress={onToggle} activeOpacity={0.8}>
      <Ionicons
        name={checked ? 'checkbox' : 'square-outline'}
        size={22}
        color={checked ? theme.colors.primary : theme.colors.textSecondary}
      />
      <Text style={{ color: theme.colors.textPrimary, fontWeight: '600', fontSize: 14 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function AdminHrScreen() {
  const theme = useTeacherTheme();
  const hr = useAdminHrData();
  const [tab, setTab] = useState<AdminHrTab>('leave-types');

  const [typeModal, setTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<LeaveTypeRow | null>(null);
  const [typeForm, setTypeForm] = useState({
    name: '',
    code: '',
    maxDays: '10',
    isPaid: true,
    carryForward: false,
    description: '',
  });

  const [leaveModal, setLeaveModal] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveAppRow | null>(null);
  const [leaveForm, setLeaveForm] = useState({
    staffId: '',
    leaveTypeId: '',
    applyDate: toLocalDateStr(),
    fromDate: '',
    toDate: '',
    halfDay: '' as '' | 'first_half' | 'second_half',
    reason: '',
  });

  const [payModal, setPayModal] = useState(false);
  const [editingPay, setEditingPay] = useState<PayslipRow | null>(null);
  const [viewPay, setViewPay] = useState<PayslipRow | null>(null);
  const [payForm, setPayForm] = useState({
    staffId: '',
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    basic: '0',
    hra: '0',
    da: '0',
    ta: '0',
    otherAllowances: '0',
    pf: '0',
    tax: '0',
    otherDeductions: '0',
    status: 'draft',
  });

  const leaveStatusChips: ChipOption[] = useMemo(
    () => [
      { key: '', label: 'All' },
      ...LEAVE_STATUSES.map((s) => ({ key: s, label: s })),
    ],
    [],
  );

  const yearOpts = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 2, y - 1, y, y + 1].map((v) => ({ label: String(v), value: String(v) }));
  }, []);

  const staffOpts = hr.staff.map((s) => ({
    label: `${s.name}${s.employeeCode ? ` (${s.employeeCode})` : ''}`,
    value: String(s.id),
  }));

  const openTypeCreate = () => {
    setEditingType(null);
    setTypeForm({
      name: '',
      code: '',
      maxDays: '10',
      isPaid: true,
      carryForward: false,
      description: '',
    });
    setTypeModal(true);
  };

  const openLeaveCreate = () => {
    setEditingLeave(null);
    setLeaveForm({
      staffId: hr.staff[0] ? String(hr.staff[0].id) : '',
      leaveTypeId: hr.leaveTypes[0] ? String(hr.leaveTypes[0].id) : '',
      applyDate: toLocalDateStr(),
      fromDate: '',
      toDate: '',
      halfDay: '',
      reason: '',
    });
    setLeaveModal(true);
  };

  const openPayCreate = () => {
    setEditingPay(null);
    setPayForm({
      staffId: hr.staff[0] ? String(hr.staff[0].id) : '',
      month: String(hr.payslipMonth),
      year: String(hr.payslipYear),
      basic: '0',
      hra: '0',
      da: '0',
      ta: '0',
      otherAllowances: '0',
      pf: '0',
      tax: '0',
      otherDeductions: '0',
      status: 'draft',
    });
    setPayModal(true);
  };

  return (
    <TeacherScreen
      header={
        <ScreenHeader
          title="HR & Payroll"
          trailingIcon="refresh-outline"
          onTrailingPress={() => void hr.refetch()}
        />
      }
      contentStyle={styles.content}
    >
      {hr.status === 'loading' ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 12 }} />
      ) : null}
      {hr.error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{hr.error}</Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRail}
      >
        {HR_TABS.map((t) => {
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

      {/* Leave Types */}
      {tab === 'leave-types' ? (
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {hr.leaveTypes.length} leave type{hr.leaveTypes.length === 1 ? '' : 's'}
            </Text>
            <CompactBtn label="Refresh" outline icon="refresh" onPress={() => void hr.loadLeaveTypes()} />
            <CompactBtn label="New Leave Type" icon="add" onPress={openTypeCreate} />
          </View>
          {hr.leaveTypes.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="No leave types"
              message="Create Casual / Sick leave policies."
            />
          ) : (
            hr.leaveTypes.map((t) => (
              <SurfaceCard key={t.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {t.name}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      {t.code || '—'} · Max {t.maxDays} days/year
                    </Text>
                    <View style={styles.row}>
                      <Badge label={t.isPaid ? 'Paid' : 'Unpaid'} accent={t.isPaid ? 'green' : 'orange'} />
                      <Badge
                        label={t.carryForward ? 'Carry fwd' : 'No carry'}
                        accent={t.carryForward ? 'blue' : 'red'}
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.row}>
                  <CompactBtn
                    label="Edit"
                    outline
                    onPress={() => {
                      setEditingType(t);
                      setTypeForm({
                        name: t.name,
                        code: t.code,
                        maxDays: String(t.maxDays),
                        isPaid: t.isPaid,
                        carryForward: t.carryForward,
                        description: t.description,
                      });
                      setTypeModal(true);
                    }}
                  />
                  {t.isActive ? (
                    <CompactBtn
                      label="Deactivate"
                      outline
                      onPress={() => {
                        Alert.alert('Deactivate?', t.name, [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Deactivate',
                            style: 'destructive',
                            onPress: () => void hr.removeLeaveType(t.id),
                          },
                        ]);
                      }}
                    />
                  ) : null}
                </View>
              </SurfaceCard>
            ))
          )}
        </View>
      ) : null}

      {/* Leave Applications */}
      {tab === 'leave-apps' ? (
        <View style={styles.section}>
          <FilterChips
            size="sm"
            options={leaveStatusChips}
            activeKey={hr.leaveStatusFilter}
            onChange={(k) => hr.setLeaveStatusFilter(k)}
          />
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {hr.leaveApps.length} leave request{hr.leaveApps.length === 1 ? '' : 's'}
            </Text>
            <CompactBtn label="Refresh" outline icon="refresh" onPress={() => void hr.loadLeaveApps()} />
            <CompactBtn label="New Apply Leave" icon="add" onPress={openLeaveCreate} />
          </View>
          {hr.leaveApps.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="No leave requests"
              message="Apply leave for staff or wait for submissions."
            />
          ) : (
            hr.leaveApps.map((a) => (
              <SurfaceCard key={a.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {a.staffName}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      {a.leaveTypeName}
                      {a.halfDay
                        ? ` · ${a.halfDay === 'first_half' ? 'First Half' : 'Second Half'}`
                        : ''}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      {a.fromDate === a.toDate
                        ? a.fromDate
                        : `${a.fromDate} → ${a.toDate}`}{' '}
                      · {a.days} day{a.days === 1 ? '' : 's'} · Applied {a.applyDate || '—'}
                    </Text>
                  </View>
                  <Badge label={a.status} accent={statusAccent(a.status)} />
                </View>
                <View style={styles.row}>
                  <CompactBtn
                    label="Edit"
                    outline
                    onPress={() => {
                      setEditingLeave(a);
                      setLeaveForm({
                        staffId: String(a.staffId),
                        leaveTypeId: String(a.leaveTypeId),
                        applyDate: a.applyDate || toLocalDateStr(),
                        fromDate: a.fromDate,
                        toDate: a.toDate,
                        halfDay: a.halfDay,
                        reason: a.reason,
                      });
                      setLeaveModal(true);
                    }}
                  />
                  {a.status === 'pending' ? (
                    <>
                      <CompactBtn
                        label="Approve"
                        onPress={() => void hr.approveLeave(a.id, 'approved')}
                      />
                      <CompactBtn
                        label="Reject"
                        outline
                        onPress={() => void hr.approveLeave(a.id, 'rejected')}
                      />
                    </>
                  ) : null}
                  {a.isActive ? (
                    <CompactBtn
                      label="Del"
                      outline
                      onPress={() => {
                        Alert.alert('Deactivate leave?', a.staffName, [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Deactivate',
                            style: 'destructive',
                            onPress: () => void hr.removeLeaveApp(a.id),
                          },
                        ]);
                      }}
                    />
                  ) : null}
                </View>
              </SurfaceCard>
            ))
          )}
        </View>
      ) : null}

      {/* Payslips */}
      {tab === 'payslips' ? (
        <View style={styles.section}>
          <SurfaceCard style={{ gap: 8 }}>
            <FormField label="View Period">
              <SelectField
                options={[
                  { label: 'All', value: 'all' },
                  { label: 'Monthly', value: 'monthly' },
                  { label: 'Yearly', value: 'yearly' },
                ]}
                value={hr.payslipViewPeriod}
                onChange={(v) =>
                  hr.setPayslipViewPeriod(v as 'all' | 'monthly' | 'yearly')
                }
              />
            </FormField>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <FormField label="Month">
                  <SelectField
                    options={MONTH_OPTS}
                    value={String(hr.payslipMonth)}
                    onChange={(v) => hr.setPayslipMonth(Number(v))}
                  />
                </FormField>
              </View>
              <View style={{ flex: 1 }}>
                <FormField label="Year">
                  <SelectField
                    options={yearOpts}
                    value={String(hr.payslipYear)}
                    onChange={(v) => hr.setPayslipYear(Number(v))}
                  />
                </FormField>
              </View>
            </View>
            <FormField label="Department">
              <SelectField
                options={[
                  { label: 'All', value: '' },
                  ...hr.departmentOptions.map((d) => ({ label: d, value: d })),
                ]}
                value={hr.payslipDepartment}
                onChange={hr.setPayslipDepartment}
              />
            </FormField>
            <SearchBar
              value={hr.payslipQuery}
              onChangeText={hr.setPayslipQuery}
              placeholder="Name or Code…"
            />
          </SurfaceCard>
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {hr.payslipTotal} payslip{hr.payslipTotal === 1 ? '' : 's'}
            </Text>
            <CompactBtn label="Refresh" outline icon="refresh" onPress={() => void hr.loadPayslips()} />
            <CompactBtn label="New Payslip" icon="add" onPress={openPayCreate} />
          </View>
          {hr.payslips.length === 0 ? (
            <EmptyState
              icon="wallet-outline"
              title="No payslips"
              message="Generate a payslip for staff."
            />
          ) : (
            hr.payslips.map((p) => (
              <SurfaceCard key={p.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {p.staffName}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      {p.employeeCode} · {p.designation || '—'} · {p.employmentType}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      {MONTH_OPTS[p.month - 1]?.label?.slice(0, 3) || p.month}/{p.year} · Net{' '}
                      {currency(p.net)}
                    </Text>
                  </View>
                  <Badge label={p.status} accent={statusAccent(p.status)} />
                </View>
                <View style={styles.row}>
                  <CompactBtn
                    label="View"
                    outline
                    icon="eye-outline"
                    onPress={() => setViewPay(p)}
                  />
                  <CompactBtn
                    label="Download"
                    outline
                    icon="download-outline"
                    onPress={() => void downloadPayslipPdf(p)}
                  />
                  <CompactBtn
                    label="Edit"
                    outline
                    onPress={() => {
                      setEditingPay(p);
                      setPayForm({
                        staffId: String(p.staffId),
                        month: String(p.month),
                        year: String(p.year),
                        basic: String(p.basic),
                        hra: String(p.hra),
                        da: String(p.da),
                        ta: String(p.ta),
                        otherAllowances: String(p.otherAllowances),
                        pf: String(p.pf),
                        tax: String(p.tax),
                        otherDeductions: String(p.otherDeductions),
                        status: p.status || 'draft',
                      });
                      setPayModal(true);
                    }}
                  />
                  {p.isActive ? (
                    <CompactBtn
                      label="Deactivate"
                      outline
                      onPress={() => {
                        Alert.alert('Deactivate payslip?', p.staffName, [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Deactivate',
                            style: 'destructive',
                            onPress: () => void hr.removePayslip(p.id),
                          },
                        ]);
                      }}
                    />
                  ) : null}
                </View>
              </SurfaceCard>
            ))
          )}
        </View>
      ) : null}

      {/* Leave type modal */}
      <Modal visible={typeModal} animationType="slide" onRequestClose={() => setTypeModal(false)}>
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingType ? 'Edit Leave Type' : 'New Leave Type'}
            </Text>
            <TouchableOpacity onPress={() => setTypeModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="Name" required>
              <TextField
                value={typeForm.name}
                onChangeText={(v) => setTypeForm((f) => ({ ...f, name: v }))}
              />
            </FormField>
            <FormField label="Code">
              <TextField
                value={typeForm.code}
                onChangeText={(v) => setTypeForm((f) => ({ ...f, code: v }))}
              />
            </FormField>
            <FormField label="Max Days/Year">
              <TextField
                value={typeForm.maxDays}
                onChangeText={(v) => setTypeForm((f) => ({ ...f, maxDays: v }))}
                keyboardType="numeric"
              />
            </FormField>
            <CheckRow
              label="Paid"
              checked={typeForm.isPaid}
              onToggle={() => setTypeForm((f) => ({ ...f, isPaid: !f.isPaid }))}
            />
            <CheckRow
              label="Carry Forward"
              checked={typeForm.carryForward}
              onToggle={() => setTypeForm((f) => ({ ...f, carryForward: !f.carryForward }))}
            />
            <FormField label="Description">
              <TextField
                value={typeForm.description}
                onChangeText={(v) => setTypeForm((f) => ({ ...f, description: v }))}
                multiline
              />
            </FormField>
            <PrimaryButton
              label={hr.busy ? 'Saving…' : 'Save'}
              disabled={hr.busy}
              onPress={() => {
                void (async () => {
                  const ok = await hr.saveLeaveType(
                    {
                      name: typeForm.name,
                      code: typeForm.code,
                      maxDays: Number(typeForm.maxDays) || 0,
                      isPaid: typeForm.isPaid,
                      carryForward: typeForm.carryForward,
                      description: typeForm.description,
                    },
                    editingType?.id,
                  );
                  if (ok) setTypeModal(false);
                  else Alert.alert('Save failed', hr.error || 'Could not save');
                })();
              }}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Leave apply modal */}
      <Modal visible={leaveModal} animationType="slide" onRequestClose={() => setLeaveModal(false)}>
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingLeave ? 'Edit Apply Leave' : 'Apply Leave'}
            </Text>
            <TouchableOpacity onPress={() => setLeaveModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="Apply Date" required>
              <TextField
                value={leaveForm.applyDate}
                onChangeText={(v) => setLeaveForm((f) => ({ ...f, applyDate: v }))}
                placeholder="YYYY-MM-DD"
              />
            </FormField>
            <FormField label="Available Leave" required>
              <SelectField
                options={hr.leaveTypes.map((t) => ({ label: t.name, value: String(t.id) }))}
                value={leaveForm.leaveTypeId || null}
                onChange={(v) => setLeaveForm((f) => ({ ...f, leaveTypeId: v }))}
                placeholder="Select"
              />
            </FormField>
            <FormField label="Leave From Date" required>
              <TextField
                value={leaveForm.fromDate}
                onChangeText={(v) => setLeaveForm((f) => ({ ...f, fromDate: v }))}
                placeholder="YYYY-MM-DD"
              />
            </FormField>
            <FormField label="Leave To Date" required>
              <TextField
                value={leaveForm.toDate}
                onChangeText={(v) => setLeaveForm((f) => ({ ...f, toDate: v }))}
                placeholder="YYYY-MM-DD"
              />
            </FormField>
            <FormField label="Staff" required>
              <SelectField
                options={staffOpts}
                value={leaveForm.staffId || null}
                onChange={(v) => setLeaveForm((f) => ({ ...f, staffId: v }))}
                placeholder="Select staff"
              />
            </FormField>
            <CheckRow
              label="Half Day (First Half)"
              checked={leaveForm.halfDay === 'first_half'}
              onToggle={() =>
                setLeaveForm((f) => ({
                  ...f,
                  halfDay: f.halfDay === 'first_half' ? '' : 'first_half',
                }))
              }
            />
            <CheckRow
              label="Half Day (Second Half)"
              checked={leaveForm.halfDay === 'second_half'}
              onToggle={() =>
                setLeaveForm((f) => ({
                  ...f,
                  halfDay: f.halfDay === 'second_half' ? '' : 'second_half',
                }))
              }
            />
            {leaveForm.halfDay ? (
              <CompactBtn
                label="Clear half day"
                outline
                onPress={() => setLeaveForm((f) => ({ ...f, halfDay: '' }))}
              />
            ) : null}
            <FormField label="Reason">
              <TextField
                value={leaveForm.reason}
                onChangeText={(v) => setLeaveForm((f) => ({ ...f, reason: v }))}
                multiline
              />
            </FormField>
            <PrimaryButton
              label={hr.busy ? 'Saving…' : 'Save'}
              disabled={hr.busy}
              onPress={() => {
                if (
                  !leaveForm.staffId ||
                  !leaveForm.leaveTypeId ||
                  !leaveForm.applyDate ||
                  !leaveForm.fromDate ||
                  !leaveForm.toDate
                ) {
                  Alert.alert(
                    'Required',
                    'Apply date, staff, leave type, and leave dates are required',
                  );
                  return;
                }
                void (async () => {
                  const ok = await hr.saveLeaveApp(
                    {
                      staffId: Number(leaveForm.staffId),
                      leaveTypeId: Number(leaveForm.leaveTypeId),
                      applyDate: leaveForm.applyDate,
                      fromDate: leaveForm.fromDate,
                      toDate: leaveForm.toDate,
                      halfDay: leaveForm.halfDay,
                      reason: leaveForm.reason,
                      status: editingLeave?.status,
                    },
                    editingLeave?.id,
                  );
                  if (ok) setLeaveModal(false);
                  else Alert.alert('Save failed', hr.error || 'Could not save');
                })();
              }}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Payslip modal */}
      <Modal visible={payModal} animationType="slide" onRequestClose={() => setPayModal(false)}>
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingPay ? 'Edit Payslip' : 'New Payslip'}
            </Text>
            <TouchableOpacity onPress={() => setPayModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="Staff" required>
              <SelectField
                options={staffOpts}
                value={payForm.staffId || null}
                onChange={(v) => setPayForm((f) => ({ ...f, staffId: v }))}
                placeholder="Select staff"
              />
            </FormField>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <FormField label="Month" required>
                  <SelectField
                    options={MONTH_OPTS}
                    value={payForm.month}
                    onChange={(v) => setPayForm((f) => ({ ...f, month: v }))}
                  />
                </FormField>
              </View>
              <View style={{ flex: 1 }}>
                <FormField label="Year" required>
                  <SelectField
                    options={yearOpts}
                    value={payForm.year}
                    onChange={(v) => setPayForm((f) => ({ ...f, year: v }))}
                  />
                </FormField>
              </View>
            </View>
            {(
              [
                ['basic', 'Basic Salary'],
                ['hra', 'HRA'],
                ['da', 'DA'],
                ['ta', 'TA'],
                ['otherAllowances', 'Other Allowances'],
                ['pf', 'PF Deduction'],
                ['tax', 'Tax Deduction'],
                ['otherDeductions', 'Other Deductions'],
              ] as const
            ).map(([key, label]) => (
              <FormField key={key} label={label}>
                <TextField
                  value={payForm[key]}
                  onChangeText={(v) => setPayForm((f) => ({ ...f, [key]: v }))}
                  keyboardType="numeric"
                />
              </FormField>
            ))}
            <FormField label="Status">
              <SelectField
                options={PAYSLIP_STATUSES.map((s) => ({ label: s, value: s }))}
                value={payForm.status}
                onChange={(v) => setPayForm((f) => ({ ...f, status: v }))}
              />
            </FormField>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
              Gross / Net auto-calculated on save.
            </Text>
            <PrimaryButton
              label={hr.busy ? 'Saving…' : 'Save'}
              disabled={hr.busy}
              onPress={() => {
                if (!payForm.staffId || !payForm.month || !payForm.year) {
                  Alert.alert('Required', 'Staff, month, and year are required');
                  return;
                }
                void (async () => {
                  const ok = await hr.savePayslip(
                    {
                      staffId: Number(payForm.staffId),
                      month: Number(payForm.month),
                      year: Number(payForm.year),
                      basic: Number(payForm.basic) || 0,
                      hra: Number(payForm.hra) || 0,
                      da: Number(payForm.da) || 0,
                      ta: Number(payForm.ta) || 0,
                      otherAllowances: Number(payForm.otherAllowances) || 0,
                      pf: Number(payForm.pf) || 0,
                      tax: Number(payForm.tax) || 0,
                      otherDeductions: Number(payForm.otherDeductions) || 0,
                      status: payForm.status,
                    },
                    editingPay?.id,
                  );
                  if (ok) setPayModal(false);
                  else Alert.alert('Save failed', hr.error || 'Could not save');
                })();
              }}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Payslip details — web / teacher Payslip Details parity */}
      <Modal
        visible={!!viewPay}
        animationType="slide"
        onRequestClose={() => setViewPay(null)}
      >
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View
            style={[
              styles.modalHeader,
              { backgroundColor: theme.colors.primary, paddingTop: 12 },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.textInverse }]}>Details</Text>
            <TouchableOpacity onPress={() => setViewPay(null)} hitSlop={10}>
              <Ionicons name="close" size={24} color={theme.colors.textInverse} />
            </TouchableOpacity>
          </View>
          {viewPay ? (
            <ScrollView
              contentContainerStyle={styles.modalBody}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.detailPeriod, { color: theme.colors.textPrimary }]}>
                Payslip For The Period Of{' '}
                {MONTH_OPTS[viewPay.month - 1]?.label || viewPay.month} {viewPay.year}
              </Text>
              <View style={styles.detailMetaRow}>
                <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }}>
                  Payslip #{viewPay.id}
                </Text>
                <Badge label={viewPay.status} accent={statusAccent(viewPay.status)} />
              </View>

              <SurfaceCard>
                <DetailRow label="Staff ID" value={viewPay.employeeCode} />
                <DetailRow label="Name" value={viewPay.staffName} />
                <DetailRow label="Department" value={viewPay.department || '—'} />
                <DetailRow
                  label="Designation"
                  value={viewPay.designation || '—'}
                  divider={false}
                />
              </SurfaceCard>

              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
                Earnings
              </Text>
              <SurfaceCard>
                <DetailRow label="Basic Salary" value={currency(viewPay.basic)} />
                <DetailRow label="HRA" value={currency(viewPay.hra)} />
                <DetailRow label="DA" value={currency(viewPay.da)} />
                <DetailRow label="TA" value={currency(viewPay.ta)} />
                <DetailRow
                  label="Other Allowances"
                  value={currency(viewPay.otherAllowances)}
                />
                <DetailRow
                  label="Total Earning"
                  value={currency(viewPay.gross)}
                  bold
                  valueColor={theme.colors.success}
                  divider={false}
                />
              </SurfaceCard>

              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
                Deductions
              </Text>
              <SurfaceCard>
                <DetailRow label="PF Deduction" value={currency(viewPay.pf)} />
                <DetailRow label="Tax Deduction" value={currency(viewPay.tax)} />
                <DetailRow
                  label="Other Deductions"
                  value={currency(viewPay.otherDeductions)}
                />
                <DetailRow
                  label="Total Deduction"
                  value={currency(viewPay.pf + viewPay.tax + viewPay.otherDeductions)}
                  bold
                  valueColor={theme.colors.danger}
                  divider={false}
                />
              </SurfaceCard>

              <SurfaceCard style={{ backgroundColor: theme.colors.tintTeal }}>
                <DetailRow label="Basic Salary" value={currency(viewPay.basic)} />
                <DetailRow label="Gross Salary" value={currency(viewPay.gross)} />
                <DetailRow
                  label="Net Salary"
                  value={currency(viewPay.net)}
                  bold
                  valueColor={theme.colors.primary}
                  divider={false}
                />
              </SurfaceCard>

              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                This payslip is computer generated hence no signature is required.
              </Text>

              <View style={styles.row}>
                <CompactBtn
                  label="Download PDF"
                  icon="download-outline"
                  onPress={() => void downloadPayslipPdf(viewPay)}
                />
                <CompactBtn label="Close" outline onPress={() => setViewPay(null)} />
              </View>
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </TeacherScreen>
  );
}

function DetailRow({
  label,
  value,
  bold,
  valueColor,
  divider = true,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueColor?: string;
  divider?: boolean;
}) {
  const theme = useTeacherTheme();
  return (
    <View
      style={[
        styles.detailRow,
        divider && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: bold ? '800' : '500',
          color: theme.colors.textSecondary,
          flex: 1,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 14,
          fontWeight: bold ? '800' : '700',
          color: valueColor || theme.colors.textPrimary,
        }}
      >
        {value}
      </Text>
    </View>
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
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 8 },
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
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
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
  detailPeriod: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3, marginTop: 4 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 12,
  },
});
