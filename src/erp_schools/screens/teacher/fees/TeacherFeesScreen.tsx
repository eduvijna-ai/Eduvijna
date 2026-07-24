/**
 * Teacher Fees — polished instructor Fees UI (web FeesTab parity).
 * Tabs: Fee Assignment | Fees Register | Demand Bill | Collections
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  StatGrid,
  FilterChips,
  Badge,
  EmptyState,
  Avatar,
  PrimaryButton,
  FormField,
  TextField,
  SelectField,
  SearchBar,
  type ChipOption,
  type StatItem,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import {
  useTeacherFeesData,
  COLLECTION_STATUSES,
  FEE_FREQUENCIES,
  type FeeAssignmentRow,
  type FeeCollectionRow,
  type FeeTermRow,
  type AssignmentFormInput,
  type CollectionFormInput,
  type FeeStudentOption,
  type FeeRegisterRow,
  type DemandBillRow,
} from '../../../hooks/useTeacherFeesData';

type FeeSub = 'assignment' | 'register' | 'demand' | 'collections';

const FEE_TABS: Array<{ key: FeeSub; title: string; subtitle: string }> = [
  { key: 'assignment', title: 'Fee Assignment', subtitle: 'Assign fees to individual students.' },
  { key: 'register', title: 'Fees Register', subtitle: 'View consolidated fee register and balances.' },
  { key: 'demand', title: 'Demand Bill', subtitle: 'Generate and print demand bills.' },
  { key: 'collections', title: 'Collections', subtitle: 'Record and track fee collections.' },
];

const STATUS_CHIPS: ChipOption[] = [
  { key: '', label: 'All' },
  ...COLLECTION_STATUSES.filter((s) =>
    ['pending', 'partial', 'paid', 'overdue'].includes(s),
  ).map((s) => ({ key: s, label: s })),
];

const currency = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

function statusAccent(status: string): 'green' | 'red' | 'orange' | 'blue' | 'teal' {
  const s = status.toLowerCase();
  if (s.includes('paid') && !s.includes('partial')) return 'green';
  if (s.includes('over')) return 'red';
  if (s.includes('partial') || s.includes('pending')) return 'orange';
  if (s.includes('waiv')) return 'blue';
  return 'teal';
}

function parseYmd(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function TeacherFeesScreen() {
  const theme = useTeacherTheme();
  const fees = useTeacherFeesData();
  const [sub, setSub] = useState<FeeSub>('register');
  const [assignQuery, setAssignQuery] = useState('');

  const [assignModal, setAssignModal] = useState(false);
  const [editingAssign, setEditingAssign] = useState<FeeAssignmentRow | null>(null);
  const [termsModal, setTermsModal] = useState(false);
  const [termsRow, setTermsRow] = useState<FeeAssignmentRow | null>(null);
  const [terms, setTerms] = useState<FeeTermRow[]>([]);
  const [termsLoading, setTermsLoading] = useState(false);

  const [collectionModal, setCollectionModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<FeeCollectionRow | null>(null);
  const [registerDetail, setRegisterDetail] = useState<FeeRegisterRow | null>(null);
  const [demandSelected, setDemandSelected] = useState<Set<number>>(new Set());
  const [demandSlip, setDemandSlip] = useState<DemandBillRow | null>(null);
  const [assignMenu, setAssignMenu] = useState<FeeAssignmentRow | null>(null);
  const [collectionMenu, setCollectionMenu] = useState<FeeCollectionRow | null>(null);

  const shellKpis: StatItem[] = [
    {
      key: 'due',
      icon: 'cash-outline',
      value: currency(fees.kpis.totalDue),
      label: 'Total Due',
      accent: 'orange',
    },
    {
      key: 'collected',
      icon: 'checkmark-circle-outline',
      value: currency(fees.kpis.totalCollected),
      label: 'Collected',
      accent: 'green',
    },
    {
      key: 'pending',
      icon: 'hourglass-outline',
      value: currency(fees.kpis.totalPending),
      label: 'Pending',
      accent: 'orange',
    },
    {
      key: 'rate',
      icon: 'trending-up-outline',
      value: `${fees.kpis.collectionRate}%`,
      label: 'Collection Rate',
      accent: 'blue',
    },
    {
      key: 'today',
      icon: 'today-outline',
      value: currency(fees.kpis.todayCollection),
      label: "Today's Coll.",
      accent: 'purple',
    },
    {
      key: 'month',
      icon: 'calendar-outline',
      value: currency(fees.kpis.thisMonthCollection),
      label: 'This Month',
      accent: 'teal',
    },
  ];

  const registerKpis: StatItem[] = [
    { key: 'tf', icon: 'wallet-outline', value: currency(fees.registerSummary.totalDue), label: 'Total Fees', accent: 'teal' },
    { key: 'disc', icon: 'pricetag-outline', value: currency(fees.registerSummary.totalDiscount), label: 'Discount', accent: 'green' },
    { key: 'recv', icon: 'checkmark-done-outline', value: currency(fees.registerSummary.totalPaid), label: 'Received', accent: 'blue' },
    { key: 'bal', icon: 'alert-circle-outline', value: currency(fees.registerSummary.totalBalance), label: 'Balance', accent: 'red' },
  ];

  const classSelectOptions = useMemo(
    () => [
      { label: 'All classes', value: '' },
      ...fees.classOptions.map((c) => ({ label: c.name, value: String(c.id) })),
    ],
    [fees.classOptions],
  );

  const filteredAssignments = useMemo(() => {
    const q = assignQuery.trim().toLowerCase();
    if (!q) return fees.assignments;
    return fees.assignments.filter(
      (a) =>
        a.studentName.toLowerCase().includes(q) ||
        a.admissionNo.toLowerCase().includes(q) ||
        a.className.toLowerCase().includes(q),
    );
  }, [fees.assignments, assignQuery]);

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        label: new Date(2000, i, 1).toLocaleString('en', { month: 'long' }),
        value: String(i + 1),
      })),
    [],
  );
  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1, y + 2].map((v) => ({ label: String(v), value: String(v) }));
  }, []);

  const demandTotals = useMemo(() => {
    const rows =
      demandSelected.size > 0
        ? fees.demandRows.filter((r) => demandSelected.has(r.studentId))
        : fees.demandRows;
    return {
      term: rows.reduce((s, r) => s + r.termAmount, 0),
      prev: rows.reduce((s, r) => s + r.previousDues, 0),
      total: rows.reduce((s, r) => s + r.totalAmount, 0),
      count: rows.length,
    };
  }, [fees.demandRows, demandSelected]);

  const openTerms = async (row: FeeAssignmentRow) => {
    setAssignMenu(null);
    setTermsRow(row);
    setTermsModal(true);
    setTermsLoading(true);
    try {
      setTerms(await fees.loadTerms(Number(row.id)));
    } catch (e) {
      Alert.alert('Terms', e instanceof Error ? e.message : 'Failed to load terms');
    } finally {
      setTermsLoading(false);
    }
  };

  return (
    <TeacherScreen
      header={
        <ScreenHeader
          title="Fee Management"
          trailingIcon="refresh-outline"
          onTrailingPress={() => void fees.refetch()}
        />
      }
      contentStyle={styles.content}
    >
      {fees.status === 'loading' ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 8 }} />
      ) : null}
      {fees.error ? (
        <Text style={[styles.errorText, { color: theme.colors.danger }]}>{fees.error}</Text>
      ) : null}

      {/* Shell KPIs — tinted tiles only, no white wrapper (mobile) */}
      <StatGrid items={shellKpis} columns={3} variant="tinted" />

      {/* Module tabs — web ERPSubTabRail style */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRail}
      >
        {FEE_TABS.map((tab) => {
          const active = sub === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setSub(tab.key)}
              activeOpacity={0.88}
              style={[
                styles.tabCard,
                theme.shadow.light,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.tabTitle,
                  { color: active ? theme.colors.textInverse : theme.colors.textPrimary },
                ]}
                numberOfLines={1}
              >
                {tab.title}
              </Text>
              <Text
                style={[
                  styles.tabSub,
                  {
                    color: active
                      ? 'rgba(255,255,255,0.82)'
                      : theme.colors.textSecondary,
                  },
                ]}
                numberOfLines={2}
              >
                {tab.subtitle}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ════════ Fee Assignment ════════ */}
      {sub === 'assignment' ? (
        <View style={styles.sectionGap}>
          <SurfaceCard style={styles.filterCard}>
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
              Filter by Student
            </Text>
            <SearchBar
              value={assignQuery}
              onChangeText={setAssignQuery}
              placeholder="Search student…"
            />
            <Text
              style={[styles.fieldLabel, { color: theme.colors.textSecondary, marginTop: 12 }]}
            >
              Class
            </Text>
            <View style={styles.toolbarRow}>
              <View style={{ flex: 1 }}>
                <SelectField
                  options={classSelectOptions}
                  value={fees.assignClassId != null ? String(fees.assignClassId) : ''}
                  onChange={(v) => fees.setAssignClassId(v ? Number(v) : undefined)}
                  placeholder="All classes"
                />
              </View>
              <CompactButton
                label="New Assignment"
                icon="add"
                onPress={() => {
                  setEditingAssign(null);
                  setAssignModal(true);
                }}
              />
            </View>
            <Text style={[styles.recordCount, { color: theme.colors.textSecondary }]}>
              {filteredAssignments.length} records
            </Text>
          </SurfaceCard>

          <SurfaceCard padded={false} style={styles.listCard}>
            {fees.assignLoading ? (
              <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
            ) : filteredAssignments.length === 0 ? (
              <EmptyState
                icon="document-text-outline"
                title="No assignments"
                message="No fee assignments found. Tap '+ New Assignment' to get started."
              />
            ) : (
              filteredAssignments.map((row, index) => (
                <TouchableOpacity
                  key={row.id}
                  style={[
                    styles.feeRow,
                    index < filteredAssignments.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => setAssignMenu(row)}
                  activeOpacity={0.75}
                >
                  <Avatar name={row.studentName} size={44} />
                  <View style={styles.feeRowBody}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {row.studentName}
                    </Text>
                    <Text style={[styles.rowMeta, { color: theme.colors.textSecondary }]}>
                      {row.className} · ADM {row.admissionNo}
                    </Text>
                    <View style={styles.metaChips}>
                      <Badge
                        label={row.frequency.replace(/_/g, ' ')}
                        accent="blue"
                      />
                      {row.termsGenerated ? <Badge label="terms ✓" accent="green" /> : null}
                    </View>
                  </View>
                  <View style={styles.rowTrailing}>
                    <Text style={[styles.amountSuccess, { color: theme.colors.success }]}>
                      {currency(row.totalFee)}
                    </Text>
                    <Ionicons
                      name="ellipsis-horizontal"
                      size={18}
                      color={theme.colors.textSecondary}
                    />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </SurfaceCard>
        </View>
      ) : null}

      {/* ════════ Fees Register ════════ */}
      {sub === 'register' ? (
        <View style={styles.sectionGap}>
          <SurfaceCard>
            <StatGrid items={registerKpis} columns={2} variant="tinted" />
          </SurfaceCard>

          <SurfaceCard style={styles.filterCard}>
            <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
              Filters
            </Text>
            <DateField
              label="From"
              value={fees.registerFilters.dateFrom}
              onChange={(dateFrom) => fees.setRegisterFilters((f) => ({ ...f, dateFrom }))}
            />
            <DateField
              label="To"
              value={fees.registerFilters.dateTo}
              onChange={(dateTo) => fees.setRegisterFilters((f) => ({ ...f, dateTo }))}
            />
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
              Status
            </Text>
            <SelectField
              options={[
                { label: 'All', value: '' },
                ...COLLECTION_STATUSES.map((s) => ({ label: s, value: s })),
              ]}
              value={fees.registerFilters.status}
              onChange={(status) => fees.setRegisterFilters((f) => ({ ...f, status }))}
            />
            <View style={[styles.toolbarRow, { marginTop: 4 }]}>
              <CompactButton
                label="Search"
                icon="search"
                onPress={() => void fees.loadRegister()}
                style={{ flex: 0 }}
              />
              <CompactButton
                label="Clear"
                outline
                onPress={() =>
                  fees.setRegisterFilters({ dateFrom: '', dateTo: '', status: '' })
                }
              />
            </View>
            <Text style={[styles.recordCount, { color: theme.colors.textSecondary }]}>
              {fees.registerSummary.total} records
            </Text>
          </SurfaceCard>

          <SurfaceCard padded={false} style={styles.listCard}>
            {fees.registerLoading ? (
              <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
            ) : fees.register.length === 0 ? (
              <EmptyState
                icon="list-outline"
                title="No records found"
                message="No fee register rows for your class scope."
              />
            ) : (
              fees.register.map((row, index) => (
                <TouchableOpacity
                  key={row.id}
                  style={[
                    styles.feeRow,
                    index < fees.register.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => setRegisterDetail(row)}
                  activeOpacity={0.75}
                >
                  <Avatar name={row.studentName} size={44} />
                  <View style={styles.feeRowBody}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {row.studentName}
                    </Text>
                    <Text style={[styles.rowMeta, { color: theme.colors.textSecondary }]}>
                      {row.className} · ADM {row.admissionNo} · {row.term}
                    </Text>
                  </View>
                  <View style={styles.rowTrailing}>
                    <Text
                      style={[
                        styles.amountLg,
                        {
                          color:
                            row.balance > 0 ? theme.colors.danger : theme.colors.success,
                        },
                      ]}
                    >
                      {currency(row.balance)}
                    </Text>
                    <Badge label={row.status} accent={statusAccent(row.status)} />
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={theme.colors.textSecondary}
                    style={{ marginLeft: 2 }}
                  />
                </TouchableOpacity>
              ))
            )}
          </SurfaceCard>
        </View>
      ) : null}

      {/* ════════ Demand Bill ════════ */}
      {sub === 'demand' ? (
        <View style={styles.sectionGap}>
          <SurfaceCard style={styles.filterCard}>
            <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
              Generate demand bill
            </Text>
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Month</Text>
            <SelectField
              options={monthOptions}
              value={String(fees.demandMonth)}
              onChange={(v) => fees.setDemandMonth(Number(v))}
            />
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Year</Text>
            <SelectField
              options={yearOptions}
              value={String(fees.demandYear)}
              onChange={(v) => fees.setDemandYear(Number(v))}
            />
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Class</Text>
            <SelectField
              options={fees.classOptions.map((c) => ({
                label: c.name,
                value: String(c.id),
              }))}
              value={fees.demandClassId != null ? String(fees.demandClassId) : null}
              onChange={(v) => fees.setDemandClassId(Number(v))}
              placeholder="Select class"
            />
            <PrimaryButton
              label="Generate"
              icon="document-text-outline"
              loading={fees.demandLoading}
              onPress={() => void fees.loadDemandBill()}
              style={{ marginTop: 8 }}
            />
          </SurfaceCard>

          <View style={styles.toolbarRow}>
            <CompactButton
              label="SMS"
              icon="chatbubble-outline"
              outline
              onPress={() => {
                const ids =
                  demandSelected.size > 0
                    ? [...demandSelected]
                    : fees.demandRows.map((r) => r.studentId);
                void fees
                  .notifyDemand('sms', ids)
                  .then(() => Alert.alert('Sent', 'SMS notifications queued.'))
                  .catch((e) =>
                    Alert.alert('SMS failed', e instanceof Error ? e.message : 'Failed'),
                  );
              }}
            />
            <CompactButton
              label="WhatsApp"
              icon="logo-whatsapp"
              outline
              onPress={() => {
                const ids =
                  demandSelected.size > 0
                    ? [...demandSelected]
                    : fees.demandRows.map((r) => r.studentId);
                void fees
                  .notifyDemand('whatsapp', ids)
                  .then(() => Alert.alert('Sent', 'WhatsApp notifications queued.'))
                  .catch((e) =>
                    Alert.alert(
                      'WhatsApp failed',
                      e instanceof Error ? e.message : 'Failed',
                    ),
                  );
              }}
            />
          </View>

          <View
            style={[
              styles.summaryBar,
              { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>
              Selected / shown: {demandTotals.count} · Term {currency(demandTotals.term)} · Prev{' '}
              {currency(demandTotals.prev)} · Total {currency(demandTotals.total)}
            </Text>
          </View>

          {fees.demandMonthLabel ? (
            <Text style={[styles.monthLabel, { color: theme.colors.textPrimary }]}>
              {fees.demandMonthLabel}
            </Text>
          ) : null}

          <SurfaceCard padded={false} style={styles.listCard}>
            {fees.demandLoading ? (
              <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
            ) : fees.demandRows.length === 0 ? (
              <EmptyState
                icon="receipt-outline"
                title="No demand rows"
                message="Choose month, year, and class, then Generate."
              />
            ) : (
              fees.demandRows.map((row, index) => {
                const selected = demandSelected.has(row.studentId);
                return (
                  <TouchableOpacity
                    key={`${row.studentId}-${row.termLabel}-${index}`}
                    style={[
                      styles.feeRow,
                      index < fees.demandRows.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.colors.border,
                      },
                    ]}
                    onPress={() => {
                      setDemandSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(row.studentId)) next.delete(row.studentId);
                        else next.add(row.studentId);
                        return next;
                      });
                    }}
                    onLongPress={() => setDemandSlip(row)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={selected ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={theme.colors.primary}
                    />
                    <View style={[styles.feeRowBody, { marginLeft: 10 }]}>
                      <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                        {row.studentName}
                      </Text>
                      <Text style={[styles.rowMeta, { color: theme.colors.textSecondary }]}>
                        ADM {row.admissionNo} · {row.className} · {row.termLabel}
                      </Text>
                    </View>
                    <View style={styles.rowTrailing}>
                      <Text style={[styles.amountLg, { color: theme.colors.textPrimary }]}>
                        {currency(row.totalAmount)}
                      </Text>
                      <TouchableOpacity onPress={() => setDemandSlip(row)} hitSlop={8}>
                        <Text style={[styles.linkAction, { color: theme.colors.primary }]}>
                          Slip
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </SurfaceCard>
        </View>
      ) : null}

      {/* ════════ Collections ════════ */}
      {sub === 'collections' ? (
        <View style={styles.sectionGap}>
          <FilterChips
            size="sm"
            options={STATUS_CHIPS}
            activeKey={fees.collectionStatus}
            onChange={(k) => fees.setCollectionStatus(k)}
          />
          <View style={styles.toolbarRow}>
            <CompactButton
              label="Refresh"
              icon="refresh"
              outline
              onPress={() => void fees.loadCollections()}
            />
            <CompactButton
              label="New Collection"
              icon="add"
              onPress={() => {
                setEditingCollection(null);
                setCollectionModal(true);
              }}
            />
          </View>

          <SurfaceCard padded={false} style={styles.listCard}>
            {fees.collectionsLoading ? (
              <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
            ) : fees.collections.length === 0 ? (
              <EmptyState
                icon="cash-outline"
                title="No collections"
                message="No collections for your class. Tap New Collection to record one."
              />
            ) : (
              fees.collections.map((row, index) => (
                <TouchableOpacity
                  key={row.id}
                  style={[
                    styles.feeRow,
                    index < fees.collections.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => setCollectionMenu(row)}
                  activeOpacity={0.75}
                >
                  <Avatar name={row.studentName} size={44} />
                  <View style={styles.feeRowBody}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {row.studentName}
                    </Text>
                    <Text style={[styles.rowMeta, { color: theme.colors.textSecondary }]}>
                      #{row.id} · ADM {row.admissionNo} · {row.paymentMethod} · {row.paymentDate}
                    </Text>
                  </View>
                  <View style={styles.rowTrailing}>
                    <Text style={[styles.amountSuccess, { color: theme.colors.success }]}>
                      {currency(row.amountPaid)}
                    </Text>
                    <Badge label={row.status} accent={statusAccent(row.status)} />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </SurfaceCard>
        </View>
      ) : null}

      {/* Action sheets */}
      <ActionSheet
        visible={!!assignMenu}
        title={assignMenu?.studentName}
        onClose={() => setAssignMenu(null)}
        actions={[
          {
            label: 'Edit assignment',
            icon: 'create-outline',
            onPress: () => {
              if (!assignMenu) return;
              setEditingAssign(assignMenu);
              setAssignMenu(null);
              setAssignModal(true);
            },
          },
          {
            label: 'Term schedules',
            icon: 'calendar-outline',
            onPress: () => {
              if (assignMenu) void openTerms(assignMenu);
            },
          },
          ...(assignMenu?.isActive
            ? [
                {
                  label: 'Remove',
                  icon: 'trash-outline' as const,
                  danger: true,
                  onPress: () => {
                    const row = assignMenu;
                    setAssignMenu(null);
                    if (!row) return;
                    Alert.alert(
                      'Remove assignment',
                      `Deactivate fee assignment for ${row.studentName}?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: () => {
                            void fees.removeAssignment(row.id).catch((e) =>
                              Alert.alert(
                                'Error',
                                e instanceof Error ? e.message : 'Failed',
                              ),
                            );
                          },
                        },
                      ],
                    );
                  },
                },
              ]
            : []),
        ]}
      />

      <ActionSheet
        visible={!!collectionMenu}
        title={collectionMenu?.studentName}
        onClose={() => setCollectionMenu(null)}
        actions={[
          {
            label: 'Edit collection',
            icon: 'create-outline',
            onPress: () => {
              if (!collectionMenu) return;
              setEditingCollection(collectionMenu);
              setCollectionMenu(null);
              setCollectionModal(true);
            },
          },
          ...(collectionMenu?.isActive
            ? [
                {
                  label: 'Deactivate',
                  icon: 'close-circle-outline' as const,
                  danger: true,
                  onPress: () => {
                    const row = collectionMenu;
                    setCollectionMenu(null);
                    if (!row) return;
                    Alert.alert('Deactivate collection', `Deactivate #${row.id}?`, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Deactivate',
                        style: 'destructive',
                        onPress: () => {
                          void fees.removeCollection(row.id).catch((e) =>
                            Alert.alert(
                              'Error',
                              e instanceof Error ? e.message : 'Failed',
                            ),
                          );
                        },
                      },
                    ]);
                  },
                },
              ]
            : []),
        ]}
      />

      <AssignmentModal
        visible={assignModal}
        editing={editingAssign}
        classOptions={fees.classOptions}
        routes={fees.routes}
        restrictedClassId={fees.restrictedClassId}
        busy={fees.actionBusy}
        searchStudents={fees.searchStudents}
        loadStructuresForClass={fees.loadStructuresForClass}
        onClose={() => setAssignModal(false)}
        onSave={async (form) => {
          try {
            await fees.saveAssignment(editingAssign?.id ?? null, form);
            setAssignModal(false);
          } catch (e) {
            Alert.alert('Save failed', e instanceof Error ? e.message : 'Could not save');
          }
        }}
      />

      <TermsModal
        visible={termsModal}
        row={termsRow}
        terms={terms}
        loading={termsLoading}
        busy={fees.actionBusy}
        onClose={() => setTermsModal(false)}
        onRegenerate={async () => {
          if (!termsRow) return;
          try {
            await fees.regenerateTerms(termsRow);
            setTerms(await fees.loadTerms(Number(termsRow.id)));
            Alert.alert('Done', 'Terms regenerated.');
          } catch (e) {
            Alert.alert('Failed', e instanceof Error ? e.message : 'Could not regenerate');
          }
        }}
        onUpdateTerm={async (termId, patch) => {
          try {
            await fees.updateTerm(termId, patch);
            if (termsRow) setTerms(await fees.loadTerms(Number(termsRow.id)));
          } catch (e) {
            Alert.alert('Update failed', e instanceof Error ? e.message : 'Failed');
          }
        }}
      />

      <CollectionModal
        visible={collectionModal}
        editing={editingCollection}
        assignments={fees.assignments}
        restrictedClassId={fees.restrictedClassId}
        busy={fees.actionBusy}
        pendingTermForAssignment={fees.pendingTermForAssignment}
        onClose={() => setCollectionModal(false)}
        onSave={async (form) => {
          try {
            await fees.saveCollection(editingCollection?.id ?? null, form);
            setCollectionModal(false);
          } catch (e) {
            Alert.alert('Save failed', e instanceof Error ? e.message : 'Could not save');
          }
        }}
      />

      <DetailSheet
        visible={!!registerDetail}
        title={registerDetail?.studentName ?? ''}
        onClose={() => setRegisterDetail(null)}
        rows={
          registerDetail
            ? [
                ['Class', registerDetail.className],
                ['ADM #', registerDetail.admissionNo],
                ['Frequency', registerDetail.frequency],
                ['Term', registerDetail.term],
                ['Total', currency(registerDetail.total)],
                ['Paid', currency(registerDetail.paid)],
                ['Discount', currency(registerDetail.discount)],
                ['Balance', currency(registerDetail.balance)],
                ['Mode', registerDetail.mode],
                ['Status', registerDetail.status],
                ['Due Date', registerDetail.dueDate],
              ]
            : []
        }
      />

      <DetailSheet
        visible={!!demandSlip}
        title="Demand Slip"
        onClose={() => setDemandSlip(null)}
        rows={
          demandSlip
            ? [
                ['Student', demandSlip.studentName],
                ['Father', demandSlip.fatherName || '—'],
                ['Mobile', demandSlip.mobile || '—'],
                ['ADM #', demandSlip.admissionNo],
                ['Class', demandSlip.className],
                ['Term', demandSlip.termLabel],
                ['Term fee', currency(demandSlip.termAmount)],
                ['Previous dues', currency(demandSlip.previousDues)],
                ['Total', currency(demandSlip.totalAmount)],
              ]
            : []
        }
      />
    </TeacherScreen>
  );
}

/* ─── Shared UI atoms ─── */

function CompactButton({
  label,
  icon,
  onPress,
  outline,
  style,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  outline?: boolean;
  style?: object;
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
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={16}
          color={outline ? theme.colors.primary : theme.colors.textInverse}
        />
      ) : null}
      <Text
        style={[
          styles.compactBtnText,
          { color: outline ? theme.colors.primary : theme.colors.textInverse },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (ymd: string) => void;
}) {
  const theme = useTeacherTheme();
  const [open, setOpen] = useState(false);
  const date = parseYmd(value) ?? new Date();

  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[
          styles.dateTrigger,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
        <Text
          style={{
            flex: 1,
            fontSize: 15,
            fontWeight: '500',
            color: value ? theme.colors.textPrimary : theme.colors.textSecondary,
          }}
        >
          {value || 'mm/dd/yyyy'}
        </Text>
        {value ? (
          <TouchableOpacity onPress={() => onChange('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
      {open ? (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selected) => {
            if (Platform.OS === 'android') setOpen(false);
            if (selected) onChange(toYmd(selected));
          }}
        />
      ) : null}
      {Platform.OS === 'ios' && open ? (
        <TouchableOpacity onPress={() => setOpen(false)} style={{ alignSelf: 'flex-end' }}>
          <Text style={{ color: theme.colors.primary, fontWeight: '700', paddingVertical: 6 }}>
            Done
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function ActionSheet({
  visible,
  title,
  onClose,
  actions,
}: {
  visible: boolean;
  title?: string;
  onClose: () => void;
  actions: Array<{
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    danger?: boolean;
  }>;
}) {
  const theme = useTeacherTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.colors.surface }, theme.shadow.medium]}
          onPress={(e) => e.stopPropagation()}
        >
          {title ? (
            <Text style={[styles.sheetTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
          ) : null}
          {actions.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.sheetAction}
              onPress={a.onPress}
            >
              <Ionicons
                name={a.icon}
                size={20}
                color={a.danger ? theme.colors.danger : theme.colors.primary}
              />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: a.danger ? theme.colors.danger : theme.colors.textPrimary,
                }}
              >
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}
          <CompactButton label="Cancel" outline onPress={onClose} style={{ marginTop: 8 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DetailSheet({
  visible,
  title,
  rows,
  onClose,
}: {
  visible: boolean;
  title: string;
  rows: Array<[string, string]>;
  onClose: () => void;
}) {
  const theme = useTeacherTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.colors.surface }, theme.shadow.medium]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.sheetTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
          {rows.map(([k, v]) => (
            <View key={k} style={styles.detailRow}>
              <Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>{k}</Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: theme.colors.textPrimary,
                  maxWidth: '58%',
                  textAlign: 'right',
                }}
              >
                {v}
              </Text>
            </View>
          ))}
          <PrimaryButton label="Close" onPress={onClose} style={{ marginTop: 12 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ─── Modals (CRUD) ─── */

function AssignmentModal({
  visible,
  editing,
  classOptions,
  routes,
  restrictedClassId,
  busy,
  searchStudents,
  loadStructuresForClass,
  onClose,
  onSave,
}: {
  visible: boolean;
  editing: FeeAssignmentRow | null;
  classOptions: Array<{ id: number; name: string }>;
  routes: Array<{ id: number; name: string; monthlyFee: number }>;
  restrictedClassId?: number;
  busy: boolean;
  searchStudents: (q: string, classId?: number) => Promise<FeeStudentOption[]>;
  loadStructuresForClass: (
    classId: number,
  ) => Promise<Array<{ id: number; name: string; amount: number }>>;
  onClose: () => void;
  onSave: (form: AssignmentFormInput) => Promise<void>;
}) {
  const theme = useTeacherTheme();
  const [studentQuery, setStudentQuery] = useState('');
  const [studentOptions, setStudentOptions] = useState<FeeStudentOption[]>([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [studentName, setStudentName] = useState('');
  const [classId, setClassId] = useState<number | null>(restrictedClassId ?? null);
  const [baseFee, setBaseFee] = useState('0');
  const [transportFee, setTransportFee] = useState('0');
  const [waiver, setWaiver] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [frequency, setFrequency] = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [routeId, setRouteId] = useState('');
  const [transportMonths, setTransportMonths] = useState('1');
  const [structures, setStructures] = useState<
    Array<{ id: number; name: string; amount: number }>
  >([]);

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setStudentId(editing.studentId);
      setStudentName(editing.studentName);
      setClassId(editing.classId || restrictedClassId || null);
      setBaseFee(String(editing.baseFee));
      setTransportFee(String(editing.transportFee));
      setWaiver(String(editing.waiverAmount));
      setDiscount(String(editing.discountAmount));
      setFrequency(editing.frequency || 'monthly');
      setStartDate(editing.startDate || '');
      setRemarks(editing.remarks || '');
      setRouteId(editing.transportRouteId ? String(editing.transportRouteId) : '');
      setTransportMonths(String(editing.transportMonths || 1));
    } else {
      setStudentId(null);
      setStudentName('');
      setStudentQuery('');
      setClassId(restrictedClassId ?? classOptions[0]?.id ?? null);
      setBaseFee('0');
      setTransportFee('0');
      setWaiver('0');
      setDiscount('0');
      setFrequency('monthly');
      setStartDate('');
      setRemarks('');
      setRouteId('');
      setTransportMonths('1');
    }
  }, [visible, editing, restrictedClassId, classOptions]);

  useEffect(() => {
    if (!visible || !classId) return;
    void loadStructuresForClass(classId).then((list) => {
      setStructures(list);
      if (!editing && list.length > 0) {
        setBaseFee(String(list.reduce((s, x) => s + x.amount, 0)));
      }
    });
  }, [visible, classId, loadStructuresForClass, editing]);

  useEffect(() => {
    if (!visible || editing || studentQuery.trim().length < 2) {
      setStudentOptions([]);
      return;
    }
    const t = setTimeout(() => {
      void searchStudents(studentQuery, classId ?? undefined).then(setStudentOptions);
    }, 300);
    return () => clearTimeout(t);
  }, [studentQuery, classId, searchStudents, visible, editing]);

  useEffect(() => {
    const route = routes.find((r) => String(r.id) === routeId);
    const months = Number(transportMonths) || 1;
    if (route) setTransportFee(String(route.monthlyFee * months));
  }, [routeId, transportMonths, routes]);

  const total = Math.max(
    0,
    (Number(baseFee) || 0) +
      (Number(transportFee) || 0) -
      (Number(waiver) || 0) -
      (Number(discount) || 0),
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
            {editing ? 'Edit Fee Assignment' : 'New Fee Assignment'}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
          {!editing ? (
            <FormField label="Student" required>
              <SearchBar
                value={studentQuery}
                onChangeText={setStudentQuery}
                placeholder="Search student…"
              />
              {studentName ? (
                <Text style={[styles.selectedHint, { color: theme.colors.primary }]}>
                  Selected: {studentName}
                </Text>
              ) : null}
              {studentOptions.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.pickRow, { borderColor: theme.colors.border }]}
                  onPress={() => {
                    setStudentId(s.id);
                    setStudentName(s.name);
                    setStudentQuery(s.name);
                    setStudentOptions([]);
                  }}
                >
                  <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>
                    {s.name}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                    ADM {s.admissionNo}
                  </Text>
                </TouchableOpacity>
              ))}
            </FormField>
          ) : (
            <FormField label="Student">
              <Text style={{ color: theme.colors.textPrimary, fontWeight: '700', fontSize: 16 }}>
                {studentName}
              </Text>
            </FormField>
          )}

          <FormField label="Class" required>
            <SelectField
              options={classOptions.map((c) => ({ label: c.name, value: String(c.id) }))}
              value={classId != null ? String(classId) : null}
              onChange={(v) => setClassId(Number(v))}
            />
          </FormField>

          {structures.length > 0 ? (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
              Structures: {structures.map((s) => `${s.name} ${currency(s.amount)}`).join(' · ')}
            </Text>
          ) : null}

          <FormField label="Base fee">
            <TextField value={baseFee} onChangeText={setBaseFee} keyboardType="numeric" />
          </FormField>
          <FormField label="Transport route">
            <SelectField
              options={[
                { label: 'None', value: '' },
                ...routes.map((r) => ({
                  label: `${r.name} (₹${r.monthlyFee}/mo)`,
                  value: String(r.id),
                })),
              ]}
              value={routeId}
              onChange={setRouteId}
            />
          </FormField>
          <FormField label="Transport months">
            <TextField
              value={transportMonths}
              onChangeText={setTransportMonths}
              keyboardType="numeric"
            />
          </FormField>
          <FormField label="Transport fee">
            <TextField
              value={transportFee}
              onChangeText={setTransportFee}
              keyboardType="numeric"
            />
          </FormField>
          <FormField label="Waiver">
            <TextField value={waiver} onChangeText={setWaiver} keyboardType="numeric" />
          </FormField>
          <FormField label="Discount">
            <TextField value={discount} onChangeText={setDiscount} keyboardType="numeric" />
          </FormField>
          <FormField label="Frequency">
            <SelectField
              options={FEE_FREQUENCIES.map((f) => ({
                label: f.replace(/_/g, ' '),
                value: f,
              }))}
              value={frequency}
              onChange={setFrequency}
            />
          </FormField>
          <DateField label="Start date" value={startDate} onChange={setStartDate} />
          <FormField label="Remarks">
            <TextField value={remarks} onChangeText={setRemarks} multiline />
          </FormField>

          <View
            style={[
              styles.totalBanner,
              { backgroundColor: theme.colors.tintGreen, borderColor: theme.colors.border },
            ]}
          >
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
              Total fee
            </Text>
            <Text style={{ color: theme.colors.success, fontSize: 22, fontWeight: '800' }}>
              {currency(total)}
            </Text>
          </View>

          <PrimaryButton
            label={busy ? 'Saving…' : editing ? 'Update' : 'Create'}
            icon="save-outline"
            loading={busy}
            onPress={() => {
              if (!studentId || !classId) {
                Alert.alert('Required', 'Student and class are required');
                return;
              }
              void onSave({
                studentId,
                classId,
                baseFee: Number(baseFee) || 0,
                transportFee: Number(transportFee) || 0,
                waiverAmount: Number(waiver) || 0,
                discountAmount: Number(discount) || 0,
                frequency,
                startDate,
                remarks,
                transportRouteId: routeId ? Number(routeId) : undefined,
                transportMonths: Number(transportMonths) || 1,
              });
            }}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

function TermsModal({
  visible,
  row,
  terms,
  loading,
  busy,
  onClose,
  onRegenerate,
  onUpdateTerm,
}: {
  visible: boolean;
  row: FeeAssignmentRow | null;
  terms: FeeTermRow[];
  loading: boolean;
  busy: boolean;
  onClose: () => void;
  onRegenerate: () => Promise<void>;
  onUpdateTerm: (
    termId: string,
    patch: { due_date?: string; amount_due?: number; status?: string },
  ) => Promise<void>;
}) {
  const theme = useTeacherTheme();
  const total = terms.reduce((s, t) => s + t.amountDue, 0);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
        <View style={styles.modalHeader}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              Term Schedules
            </Text>
            {row ? (
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                {row.studentName} · {row.className} · {row.frequency.replace(/_/g, ' ')}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalBody}>
          {row?.startDate ? (
            <CompactButton
              label={busy ? 'Generating…' : 'Regenerate Terms'}
              icon="flash-outline"
              onPress={() => void onRegenerate()}
            />
          ) : (
            <Text style={{ color: theme.colors.warning, fontSize: 13, lineHeight: 18 }}>
              No start date on this assignment. Edit it and set a start date to generate terms.
            </Text>
          )}
          {loading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : terms.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="No terms"
              message="Regenerate terms after setting a start date."
            />
          ) : (
            terms.map((t) => (
              <SurfaceCard key={t.id} style={{ gap: 8 }}>
                <Text style={{ fontWeight: '800', fontSize: 15, color: theme.colors.textPrimary }}>
                  #{t.termNumber} · {t.termLabel}
                </Text>
                <DateField
                  label="Due date"
                  value={t.dueDate}
                  onChange={(due_date) => void onUpdateTerm(t.id, { due_date })}
                />
                <FormField label="Amount">
                  <TextField
                    value={String(t.amountDue)}
                    keyboardType="numeric"
                    onChangeText={(v) =>
                      void onUpdateTerm(t.id, { amount_due: Number(v) || 0 })
                    }
                  />
                </FormField>
                <FormField label="Status">
                  <SelectField
                    options={COLLECTION_STATUSES.map((s) => ({ label: s, value: s }))}
                    value={t.status}
                    onChange={(status) => void onUpdateTerm(t.id, { status })}
                  />
                </FormField>
              </SurfaceCard>
            ))
          )}
          {terms.length > 0 ? (
            <Text style={{ fontWeight: '800', fontSize: 16, color: theme.colors.success }}>
              TOTAL {currency(total)}
            </Text>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function CollectionModal({
  visible,
  editing,
  assignments,
  restrictedClassId,
  busy,
  pendingTermForAssignment,
  onClose,
  onSave,
}: {
  visible: boolean;
  editing: FeeCollectionRow | null;
  assignments: FeeAssignmentRow[];
  restrictedClassId?: number;
  busy: boolean;
  pendingTermForAssignment: (assignment: FeeAssignmentRow) => Promise<FeeTermRow | null>;
  onClose: () => void;
  onSave: (form: CollectionFormInput) => Promise<void>;
}) {
  const theme = useTeacherTheme();
  const scoped = assignments.filter(
    (a) => !restrictedClassId || a.classId === restrictedClassId,
  );
  const [assignmentId, setAssignmentId] = useState('');
  const [amountDue, setAmountDue] = useState('0');
  const [amountPaid, setAmountPaid] = useState('0');
  const [fine, setFine] = useState('0');
  const [method, setMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(() => toYmd(new Date()));
  const [dueDate, setDueDate] = useState('');
  const [txn, setTxn] = useState('');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState('pending');
  const [termId, setTermId] = useState<number | undefined>();
  const [feeStructureId, setFeeStructureId] = useState<number | undefined>();

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setAmountDue(String(editing.amountDue));
      setAmountPaid(String(editing.amountPaid));
      setFine(String(editing.fine));
      setMethod(editing.paymentMethod || 'cash');
      setPaymentDate(editing.paymentDate !== '—' ? editing.paymentDate : toYmd(new Date()));
      setDueDate(editing.dueDate || '');
      setTxn(editing.transactionRef || '');
      setRemarks(editing.remarks || '');
      setStatus(editing.status);
      setTermId(editing.termScheduleId);
      setFeeStructureId(editing.feeStructureId);
    } else {
      setAssignmentId(scoped[0]?.id ?? '');
      setAmountDue('0');
      setAmountPaid('0');
      setFine('0');
      setMethod('cash');
      setPaymentDate(toYmd(new Date()));
      setDueDate('');
      setTxn('');
      setRemarks('');
      setStatus('pending');
      setTermId(undefined);
      setFeeStructureId(undefined);
    }
  }, [visible, editing]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!visible || editing || !assignmentId) return;
    const asg = scoped.find((a) => a.id === assignmentId);
    if (!asg) return;
    setFeeStructureId(asg.feeStructureId);
    void pendingTermForAssignment(asg).then((term) => {
      if (term) {
        setTermId(Number(term.id));
        setAmountDue(String(term.amountDue));
        setDueDate(term.dueDate);
      } else {
        setAmountDue(String(asg.totalFee));
      }
    });
  }, [assignmentId, visible, editing, pendingTermForAssignment]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
            {editing ? 'Edit Collection' : 'New Collection'}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
          {!editing ? (
            <FormField label="Student" required>
              <SelectField
                options={scoped.map((a) => ({
                  label: `${a.studentName} · ${a.className}`,
                  value: a.id,
                }))}
                value={assignmentId || null}
                onChange={setAssignmentId}
              />
            </FormField>
          ) : (
            <FormField label="Student">
              <Text style={{ fontWeight: '700', fontSize: 16, color: theme.colors.textPrimary }}>
                {editing.studentName}
              </Text>
            </FormField>
          )}

          <FormField label="Amount due">
            <TextField value={amountDue} onChangeText={setAmountDue} keyboardType="numeric" />
          </FormField>
          <FormField label="Amount paid" required>
            <TextField value={amountPaid} onChangeText={setAmountPaid} keyboardType="numeric" />
          </FormField>
          <FormField label="Late fee">
            <TextField value={fine} onChangeText={setFine} keyboardType="numeric" />
          </FormField>
          <FormField label="Payment method">
            <SelectField
              options={['cash', 'upi', 'card', 'cheque', 'bank_transfer', 'other'].map((m) => ({
                label: m.toUpperCase(),
                value: m,
              }))}
              value={method}
              onChange={setMethod}
            />
          </FormField>
          <DateField label="Payment date" value={paymentDate} onChange={setPaymentDate} />
          <DateField label="Due date" value={dueDate} onChange={setDueDate} />
          <FormField label="Transaction ref">
            <TextField value={txn} onChangeText={setTxn} />
          </FormField>
          <FormField label="Remarks">
            <TextField value={remarks} onChangeText={setRemarks} multiline />
          </FormField>
          {editing ? (
            <FormField label="Status">
              <SelectField
                options={COLLECTION_STATUSES.map((s) => ({ label: s, value: s }))}
                value={status}
                onChange={setStatus}
              />
            </FormField>
          ) : null}

          <PrimaryButton
            label={busy ? 'Saving…' : 'Save'}
            icon="save-outline"
            loading={busy}
            onPress={() => {
              const asg = scoped.find((a) => a.id === assignmentId);
              const studentId = editing?.studentId ?? asg?.studentId;
              if (!studentId) {
                Alert.alert('Required', 'Select a student');
                return;
              }
              void onSave({
                studentId,
                feeStructureId,
                termScheduleId: termId,
                amountDue: Number(amountDue) || 0,
                amountPaid: Number(amountPaid) || 0,
                fine: Number(fine) || 0,
                paymentMethod: method,
                paymentDate,
                dueDate,
                transactionRef: txn,
                remarks,
                status: editing ? status : undefined,
              });
            }}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14, paddingBottom: 32 },
  errorText: { fontSize: 13, fontWeight: '500' },

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
  tabTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 0.1 },
  tabSub: { fontSize: 11, fontWeight: '400', lineHeight: 15, marginTop: 4 },

  sectionGap: { gap: 12 },
  filterCard: { gap: 8, paddingVertical: 16 },
  sectionHeading: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  recordCount: { fontSize: 12, fontWeight: '400', marginTop: 6 },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },

  listCard: { overflow: 'hidden' },
  loader: { marginVertical: 28 },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  feeRowBody: { flex: 1, gap: 3, minWidth: 0 },
  rowName: { fontSize: 15, fontWeight: '700' },
  rowMeta: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  rowTrailing: { alignItems: 'flex-end', gap: 6 },
  amountLg: { fontSize: 16, fontWeight: '800' },
  amountSuccess: { fontSize: 16, fontWeight: '800' },
  metaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  linkAction: { fontSize: 12, fontWeight: '700' },

  compactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  compactBtnText: { fontSize: 13, fontWeight: '700' },

  summaryBar: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  summaryText: { fontSize: 12, fontWeight: '400', lineHeight: 17 },
  monthLabel: { fontSize: 15, fontWeight: '700' },

  dateTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 4,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', marginBottom: 8 },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },

  modalRoot: { flex: 1, paddingTop: 48 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalBody: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  pickRow: {
    marginTop: 6,
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  selectedHint: { marginTop: 8, fontSize: 13, fontWeight: '700' },
  totalBanner: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
