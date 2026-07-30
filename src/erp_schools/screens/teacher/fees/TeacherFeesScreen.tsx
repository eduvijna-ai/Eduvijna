/**
 * Fees hub — web FeesTab parity.
 * Teacher: Assignment | Register | Demand | Collections (class-scoped)
 * Admin: + Fee Structure | Receipts (school-wide)
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
  ProgressBar,
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
  type FeeStructureRow,
  type FeeReceiptRow,
} from '../../../hooks/useTeacherFeesData';
import { downloadStudentFeeReceiptPdf } from '../../../utils/studentFeeReceiptPdf';
import { downloadDemandBillPdf } from '../../../utils/demandBillPdf';

type FeeSub =
  | 'structures'
  | 'assignment'
  | 'register'
  | 'demand'
  | 'collections'
  | 'receipts';

const TEACHER_FEE_TABS: Array<{ key: FeeSub; title: string; subtitle: string }> = [
  { key: 'assignment', title: 'Fee Assignment', subtitle: 'Assign fees to individual students.' },
  { key: 'register', title: 'Fees Register', subtitle: 'View consolidated fee register and balances.' },
  { key: 'demand', title: 'Demand Bill', subtitle: 'Generate and print demand bills.' },
  { key: 'collections', title: 'Collections', subtitle: 'Record and track fee collections.' },
];

const ADMIN_FEE_TABS: Array<{ key: FeeSub; title: string; subtitle: string }> = [
  { key: 'structures', title: 'Fee Structure', subtitle: 'Define fee heads and billing structures.' },
  { key: 'assignment', title: 'Fee Assignment', subtitle: 'Assign fees to individual students.' },
  { key: 'register', title: 'Fees Register', subtitle: 'View consolidated fee register and balances.' },
  { key: 'demand', title: 'Demand Bill', subtitle: 'Generate and print demand bills.' },
  { key: 'collections', title: 'Collections', subtitle: 'Record and track fee collections.' },
  { key: 'receipts', title: 'Receipts', subtitle: 'Issue and manage payment receipts.' },
];

const STATUS_CHIPS: ChipOption[] = [
  { key: '', label: 'All' },
  ...COLLECTION_STATUSES.map((s) => ({ key: s, label: s })),
];

const PAYMENT_METHODS = [
  'cash',
  'card',
  'upi',
  'bank_transfer',
  'cheque',
  'online',
  'wallet',
] as const;

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

export type TeacherFeesProps = {
  role?: 'teacher' | 'admin';
};

export default function TeacherFeesScreen({ role = 'teacher' }: TeacherFeesProps) {
  const isAdmin = role === 'admin';
  const theme = useTeacherTheme();
  const fees = useTeacherFeesData({ scope: isAdmin ? 'school' : 'teacher' });
  const feeTabs = isAdmin ? ADMIN_FEE_TABS : TEACHER_FEE_TABS;
  const [sub, setSub] = useState<FeeSub>(isAdmin ? 'structures' : 'register');
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
  const [demandViewMode, setDemandViewMode] = useState<'list' | 'slips'>('list');
  const [assignMenu, setAssignMenu] = useState<FeeAssignmentRow | null>(null);
  const [collectionMenu, setCollectionMenu] = useState<FeeCollectionRow | null>(null);
  const [receiptDownloadingId, setReceiptDownloadingId] = useState<number | null>(null);
  const [collLookup, setCollLookup] = useState<{
    studentName: string;
    admissionNo: string;
    amountDue: number;
    amount: number;
    status: string;
  } | null>(null);
  const [collLookupError, setCollLookupError] = useState('');
  const [collLookupBusy, setCollLookupBusy] = useState(false);

  const [structureModal, setStructureModal] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructureRow | null>(null);
  const [feeTypesModal, setFeeTypesModal] = useState(false);
  const [newFeeTypeName, setNewFeeTypeName] = useState('');
  const [structureForm, setStructureForm] = useState({
    name: '',
    feeTypeId: '',
    amount: '0',
    frequency: 'yearly',
    dueDay: '10',
    lateFeePerDay: '0',
    classIds: [] as number[],
    description: '',
    classSearch: '',
  });

  const [receiptModal, setReceiptModal] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<FeeReceiptRow | null>(null);
  const [receiptForm, setReceiptForm] = useState({
    collectionId: '',
    receiptNumber: '',
    amount: '0',
    paymentMethod: 'cash',
    paymentDate: toYmd(new Date()),
    remarks: '',
  });

  useEffect(() => {
    if (!isAdmin) return;
    if (sub === 'structures') {
      void fees.loadFeeTypes();
      void fees.loadStructures();
    }
    if (sub === 'receipts') void fees.loadReceipts();
  }, [
    isAdmin,
    sub,
    fees.loadFeeTypes,
    fees.loadStructures,
    fees.loadReceipts,
    fees.structureClassId,
    fees.structureFeeTypeId,
  ]);

  // Web DemandBillView auto-fetches when the tab opens
  useEffect(() => {
    if (sub !== 'demand' || fees.status !== 'ready') return;
    setDemandSelected(new Set());
    void fees.loadDemandBill();
  }, [sub, fees.status, fees.loadDemandBill]);

  // Auto-fetch collection details when typing Collection ID (web ReceiptsView parity)
  useEffect(() => {
    if (!receiptModal) return;
    const raw = receiptForm.collectionId.trim();
    const num = Number(raw);
    setCollLookup(null);
    setCollLookupError('');
    if (!raw || !Number.isFinite(num) || num <= 0) return;
    setCollLookupBusy(true);
    const t = setTimeout(() => {
      void (async () => {
        const info = await fees.lookupCollection(num);
        setCollLookupBusy(false);
        if (!info) {
          setCollLookupError('Collection not found or invalid ID');
          setCollLookup(null);
          return;
        }
        setCollLookup({
          studentName: info.studentName,
          admissionNo: info.admissionNo,
          amountDue: info.amountDue,
          amount: info.amount,
          status: info.status,
        });
        setCollLookupError('');
        setReceiptForm((f) => ({
          ...f,
          amount: String(info.amount || f.amount),
          paymentMethod: info.paymentMethod || f.paymentMethod,
          paymentDate: info.paymentDate || f.paymentDate || toYmd(new Date()),
        }));
      })();
    }, 500);
    return () => {
      clearTimeout(t);
      setCollLookupBusy(false);
    };
  }, [receiptModal, receiptForm.collectionId, fees.lookupCollection]);

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
    return [y - 2, y - 1, y, y + 1]
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .map((v) => ({ label: String(v), value: String(v) }));
  }, []);

  const demandNotifyCount =
    demandSelected.size > 0 ? demandSelected.size : fees.demandRows.length;

  const demandPrintItems = useMemo(() => {
    const rows =
      demandSelected.size > 0
        ? fees.demandRows.filter((r) => demandSelected.has(r.studentId))
        : fees.demandRows;
    return rows;
  }, [fees.demandRows, demandSelected]);

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

      {/* 30-day collection snapshot — list/summary instead of dense bar chart */}
      {fees.trend.length > 0 ? (
        <SurfaceCard>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Last 30 Days Collection
          </Text>
          {(() => {
            const activeDays = fees.trend.filter((p) => p.amount > 0);
            const periodTotal = fees.trend.reduce((s, p) => s + p.amount, 0);
            const peak = activeDays.reduce(
              (best, p) => (p.amount > best.amount ? p : best),
              activeDays[0] ?? { date: '', amount: 0 },
            );
            const rate = Math.max(0, Math.min(100, fees.kpis.collectionRate || 0));
            return (
              <View style={styles.trendSnap}>
                <View style={styles.trendStatRow}>
                  <View style={styles.trendStat}>
                    <Text style={[styles.trendStatValue, { color: theme.colors.primary }]}>
                      {currency(periodTotal)}
                    </Text>
                    <Text style={[styles.trendStatLabel, { color: theme.colors.textSecondary }]}>
                      Period total
                    </Text>
                  </View>
                  <View style={styles.trendStat}>
                    <Text style={[styles.trendStatValue, { color: theme.colors.textPrimary }]}>
                      {activeDays.length}
                    </Text>
                    <Text style={[styles.trendStatLabel, { color: theme.colors.textSecondary }]}>
                      Days with collections
                    </Text>
                  </View>
                  <View style={styles.trendStat}>
                    <Text style={[styles.trendStatValue, { color: theme.colors.success }]}>
                      {peak.amount > 0 ? currency(peak.amount) : '—'}
                    </Text>
                    <Text style={[styles.trendStatLabel, { color: theme.colors.textSecondary }]}>
                      {peak.date ? `Peak · ${peak.date.slice(5) || peak.date}` : 'Peak day'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                  Overall collection rate
                </Text>
                <ProgressBar percent={rate} height={8} color={theme.colors.primary} />
                <Text
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    fontWeight: '700',
                    color: theme.colors.textPrimary,
                  }}
                >
                  {rate}%
                </Text>
                {activeDays.length > 0 ? (
                  <View style={styles.trendDayList}>
                    {activeDays
                      .slice()
                      .sort((a, b) => b.amount - a.amount)
                      .slice(0, 5)
                      .map((p) => (
                        <View key={p.date} style={styles.trendDayRow}>
                          <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                            {p.date}
                          </Text>
                          <Text
                            style={{
                              color: theme.colors.success,
                              fontSize: 13,
                              fontWeight: '700',
                            }}
                          >
                            {currency(p.amount)}
                          </Text>
                        </View>
                      ))}
                  </View>
                ) : (
                  <Text
                    style={{
                      marginTop: 8,
                      color: theme.colors.textSecondary,
                      fontSize: 13,
                    }}
                  >
                    No collection days in the last 30 days yet.
                  </Text>
                )}
              </View>
            );
          })()}
        </SurfaceCard>
      ) : null}

      {/* Module tabs — web ERPSubTabRail style */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRail}
      >
        {feeTabs.map((tab) => {
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

      {/* ════════ Fee Structure (admin) ════════ */}
      {sub === 'structures' && isAdmin ? (
        <View style={styles.sectionGap}>
          {fees.academicYearLabel ? (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
              Academic Year: {fees.academicYearLabel}
            </Text>
          ) : null}
          <SurfaceCard style={styles.filterCard}>
            <SearchBar
              value={fees.structureQuery}
              onChangeText={fees.setStructureQuery}
              placeholder="Search structures…"
            />
            <View style={styles.toolbarRow}>
              <View style={{ flex: 1 }}>
                <SelectField
                  options={classSelectOptions}
                  value={fees.structureClassId != null ? String(fees.structureClassId) : ''}
                  onChange={(v) => fees.setStructureClassId(v ? Number(v) : undefined)}
                  placeholder="Class"
                />
              </View>
              <View style={{ flex: 1 }}>
                <SelectField
                  options={[
                    { label: 'All Fee Types', value: '' },
                    ...fees.feeTypes.map((t) => ({ label: t.name, value: String(t.id) })),
                  ]}
                  value={fees.structureFeeTypeId != null ? String(fees.structureFeeTypeId) : ''}
                  onChange={(v) => fees.setStructureFeeTypeId(v ? Number(v) : undefined)}
                />
              </View>
            </View>
            <View style={styles.toolbarRow}>
              <CompactButton
                label="Search"
                outline
                icon="search"
                onPress={() => void fees.loadStructures()}
              />
              <CompactButton
                label="New Structure"
                onPress={() => {
                  setEditingStructure(null);
                  setStructureForm({
                    name: '',
                    feeTypeId: fees.feeTypes[0] ? String(fees.feeTypes[0].id) : '',
                    amount: '0',
                    frequency: 'yearly',
                    dueDay: '10',
                    lateFeePerDay: '0',
                    classIds: [],
                    description: '',
                    classSearch: '',
                  });
                  setStructureModal(true);
                }}
              />
              <CompactButton label="Fee Types" outline onPress={() => setFeeTypesModal(true)} />
            </View>
          </SurfaceCard>
          {fees.structuresLoading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : fees.structures.length === 0 ? (
            <EmptyState icon="layers-outline" title="No structures" message="Create a fee structure to get started." />
          ) : (
            fees.structures.map((s) => (
              <SurfaceCard key={s.id} style={styles.listCard}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                    {s.name}
                  </Text>
                  <Badge label={s.feeTypeName} accent="purple" />
                </View>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                  {s.className} · {s.frequency.replace(/_/g, ' ')} · Due day {s.dueDay}
                </Text>
                <Text style={{ color: theme.colors.primary, fontWeight: '800', marginTop: 6 }}>
                  {currency(s.amount)}
                </Text>
                <View style={styles.toolbarRow}>
                  <CompactButton
                    label="Edit"
                    outline
                    onPress={() => {
                      setEditingStructure(s);
                      setStructureForm({
                        name: s.name,
                        feeTypeId: s.feeTypeId != null ? String(s.feeTypeId) : '',
                        amount: String(s.amount),
                        frequency: s.frequency,
                        dueDay: String(s.dueDay),
                        lateFeePerDay: String(s.lateFeePerDay),
                        classIds: s.classId ? [s.classId] : [],
                        description: s.description,
                        classSearch: '',
                      });
                      setStructureModal(true);
                    }}
                  />
                  <CompactButton
                    label="Deactivate"
                    outline
                    onPress={() => {
                      Alert.alert('Deactivate?', s.name, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Deactivate',
                          style: 'destructive',
                          onPress: () => void fees.removeStructure(s.structureId),
                        },
                      ]);
                    }}
                  />
                </View>
              </SurfaceCard>
            ))
          )}
        </View>
      ) : null}

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
              options={[
                { label: 'All Classes', value: '' },
                ...fees.classOptions.map((c) => ({
                  label: c.name,
                  value: String(c.id),
                })),
              ]}
              value={fees.demandClassId != null ? String(fees.demandClassId) : ''}
              onChange={(v) => fees.setDemandClassId(v ? Number(v) : undefined)}
              placeholder="All Classes"
            />
            <PrimaryButton
              label="Generate"
              icon="document-text-outline"
              loading={fees.demandLoading}
              onPress={() => {
                setDemandSelected(new Set());
                void fees.loadDemandBill();
              }}
              style={{ marginTop: 8 }}
            />
          </SurfaceCard>

          <View style={styles.toolbarRow}>
            <CompactButton
              label={demandViewMode === 'list' ? 'Slip View' : 'List View'}
              icon={demandViewMode === 'list' ? 'receipt-outline' : 'list-outline'}
              outline
              onPress={() => setDemandViewMode((m) => (m === 'list' ? 'slips' : 'list'))}
            />
            <CompactButton
              label={`SMS (${demandNotifyCount})`}
              icon="chatbubble-outline"
              outline
              onPress={() => {
                const ids =
                  demandSelected.size > 0
                    ? [...demandSelected]
                    : fees.demandRows.map((r) => r.studentId);
                if (ids.length === 0) {
                  Alert.alert('No students', 'Generate a demand bill first.');
                  return;
                }
                void fees
                  .notifyDemand('sms', ids)
                  .then(() => Alert.alert('Sent', 'SMS notifications queued.'))
                  .catch((e) =>
                    Alert.alert('SMS failed', e instanceof Error ? e.message : 'Failed'),
                  );
              }}
            />
            <CompactButton
              label={`WhatsApp (${demandNotifyCount})`}
              icon="logo-whatsapp"
              outline
              onPress={() => {
                const ids =
                  demandSelected.size > 0
                    ? [...demandSelected]
                    : fees.demandRows.map((r) => r.studentId);
                if (ids.length === 0) {
                  Alert.alert('No students', 'Generate a demand bill first.');
                  return;
                }
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
            <CompactButton
              label={`Print (${demandPrintItems.length})`}
              icon="download-outline"
              outline
              onPress={() => {
                void downloadDemandBillPdf(
                  demandPrintItems.map((r) => ({
                    studentName: r.studentName,
                    fatherName: r.fatherName,
                    admissionNo: r.admissionNo,
                    mobile: r.mobile,
                    className: r.className,
                    termLabel: r.termLabel,
                    termAmount: r.termAmount,
                    previousDues: r.previousDues,
                    totalAmount: r.totalAmount,
                  })),
                  fees.demandMonthLabel || `${fees.demandMonth}/${fees.demandYear}`,
                );
              }}
            />
          </View>

          {fees.demandMonthLabel ? (
            <Text style={[styles.monthLabel, { color: theme.colors.textPrimary }]}>
              Demand Bill – {fees.demandMonthLabel} · {fees.demandRows.length} student
              {fees.demandRows.length !== 1 ? 's' : ''}
              {demandSelected.size > 0 ? ` · ${demandSelected.size} selected` : ''}
            </Text>
          ) : null}

          <View
            style={[
              styles.summaryBar,
              { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>
              TOTAL · Term {currency(demandTotals.term)} · Prev {currency(demandTotals.prev)} ·{' '}
              <Text style={{ color: theme.colors.danger, fontWeight: '800' }}>
                {currency(demandTotals.total)}
              </Text>
            </Text>
            <Text style={[styles.summaryText, { color: theme.colors.textSecondary, marginTop: 4 }]}>
              {demandSelected.size > 0
                ? `${demandSelected.size} selected`
                : `${fees.demandRows.length} total`}{' '}
              · SMS/WhatsApp notify {demandSelected.size > 0 ? 'selected' : 'all'} students
            </Text>
          </View>

          {fees.demandRows.length > 0 ? (
            <TouchableOpacity
              onPress={() => {
                const allIds = fees.demandRows.map((r) => r.studentId);
                const allOn = allIds.every((id) => demandSelected.has(id));
                setDemandSelected(allOn ? new Set() : new Set(allIds));
              }}
              style={styles.toolbarRow}
            >
              <Ionicons
                name={
                  fees.demandRows.length > 0 &&
                  fees.demandRows.every((r) => demandSelected.has(r.studentId))
                    ? 'checkbox'
                    : 'square-outline'
                }
                size={20}
                color={theme.colors.primary}
              />
              <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13 }}>
                Select all
              </Text>
            </TouchableOpacity>
          ) : null}

          <SurfaceCard padded={false} style={styles.listCard}>
            {fees.demandLoading ? (
              <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
            ) : fees.demandRows.length === 0 ? (
              <EmptyState
                icon="receipt-outline"
                title="No demand rows"
                message="Select month and class (or All Classes), then tap Generate."
              />
            ) : demandViewMode === 'slips' ? (
              demandPrintItems.map((row, index) => (
                <View
                  key={`slip-${row.studentId}-${index}`}
                  style={[
                    styles.slipCard,
                    { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                  ]}
                >
                  <Text style={{ fontWeight: '800', color: theme.colors.primary, fontSize: 13 }}>
                    DEMAND SLIP
                  </Text>
                  <Text style={{ fontWeight: '700', color: theme.colors.textPrimary, marginTop: 6 }}>
                    {row.studentName}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                    ADM {row.admissionNo} · {row.className}
                  </Text>
                  <Text style={{ color: theme.colors.primary, fontSize: 12, marginTop: 6 }}>
                    {row.termLabel}
                  </Text>
                  <View style={[styles.rowBetween, { marginTop: 8 }]}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Term fee</Text>
                    <Text style={{ fontWeight: '700' }}>{currency(row.termAmount)}</Text>
                  </View>
                  {row.previousDues > 0 ? (
                    <View style={styles.rowBetween}>
                      <Text style={{ color: theme.colors.warning, fontSize: 12 }}>
                        Prev. dues
                      </Text>
                      <Text style={{ color: theme.colors.warning, fontWeight: '700' }}>
                        {currency(row.previousDues)}
                      </Text>
                    </View>
                  ) : null}
                  <View style={[styles.rowBetween, { marginTop: 4 }]}>
                    <Text style={{ fontWeight: '800', color: theme.colors.danger }}>TOTAL</Text>
                    <Text style={{ fontWeight: '800', color: theme.colors.danger, fontSize: 16 }}>
                      {currency(row.totalAmount)}
                    </Text>
                  </View>
                </View>
              ))
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
                      selected && { backgroundColor: `${theme.colors.primary}10` },
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
                        ADM {row.admissionNo} · {row.className}
                      </Text>
                      <Text style={{ color: theme.colors.primary, fontSize: 12, marginTop: 2 }}>
                        {row.termLabel}
                      </Text>
                      <Text style={[styles.rowMeta, { color: theme.colors.textSecondary }]}>
                        Term {currency(row.termAmount)}
                        {row.previousDues > 0
                          ? ` · Prev ${currency(row.previousDues)}`
                          : ''}
                      </Text>
                    </View>
                    <View style={styles.rowTrailing}>
                      <Text style={[styles.amountLg, { color: theme.colors.danger }]}>
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
                message="No collections found. Tap New Collection to record one."
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
                    <Text style={[styles.rowMeta, { color: theme.colors.textSecondary }]}>
                      Due {currency(row.amountDue)}
                      {row.fine > 0 ? ` · Late ${currency(row.fine)}` : ''}
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

      {/* ════════ Receipts (admin) ════════ */}
      {sub === 'receipts' && isAdmin ? (
        <View style={styles.sectionGap}>
          <View style={styles.toolbarRow}>
            <CompactButton
              label="Refresh"
              icon="refresh"
              outline
              onPress={() => void fees.loadReceipts()}
            />
            <CompactButton
              label="New Receipt"
              icon="add"
              onPress={() => {
                setEditingReceipt(null);
                setCollLookup(null);
                setCollLookupError('');
                setReceiptForm({
                  collectionId: '',
                  receiptNumber: '',
                  amount: '0',
                  paymentMethod: 'cash',
                  paymentDate: toYmd(new Date()),
                  remarks: '',
                });
                setReceiptModal(true);
              }}
            />
          </View>
          <SurfaceCard padded={false} style={styles.listCard}>
            {fees.receiptsLoading ? (
              <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
            ) : fees.receipts.length === 0 ? (
              <EmptyState
                icon="receipt-outline"
                title="No receipts"
                message="Issue a receipt against a fee collection."
              />
            ) : (
              fees.receipts.map((r, index) => (
                <View
                  key={r.id}
                  style={[
                    styles.feeRow,
                    index < fees.receipts.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.feeRowBody}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {r.receiptNumber}
                    </Text>
                    <Text style={[styles.rowMeta, { color: theme.colors.textSecondary }]}>
                      Coll #{r.collectionId} · {r.studentName} · {r.paymentMethod} ·{' '}
                      {r.paymentDate || '—'}
                    </Text>
                    <View style={styles.toolbarRow}>
                      <CompactButton
                        label="Edit"
                        outline
                        onPress={() => {
                          setEditingReceipt(r);
                          setCollLookup(null);
                          setCollLookupError('');
                          setReceiptForm({
                            collectionId: String(r.collectionId || ''),
                            receiptNumber: r.receiptNumber,
                            amount: String(r.amount),
                            paymentMethod: r.paymentMethod || 'cash',
                            paymentDate: r.paymentDate || toYmd(new Date()),
                            remarks: r.remarks,
                          });
                          setReceiptModal(true);
                        }}
                      />
                      <CompactButton
                        label={receiptDownloadingId === r.receiptId ? '…' : 'Download'}
                        outline
                        icon="download-outline"
                        onPress={() => {
                          if (receiptDownloadingId != null) return;
                          void (async () => {
                            setReceiptDownloadingId(r.receiptId);
                            try {
                              await downloadStudentFeeReceiptPdf({
                                receiptNumber: r.receiptNumber,
                                amount: r.amount,
                                paymentDate: r.paymentDate,
                                paymentMethod: r.paymentMethod,
                                collectionId: r.collectionId,
                                remarks: r.remarks,
                                studentName:
                                  r.studentName && r.studentName !== '—'
                                    ? r.studentName
                                    : undefined,
                              });
                            } catch (e) {
                              Alert.alert(
                                'Download failed',
                                e instanceof Error ? e.message : 'Could not create receipt PDF.',
                              );
                            } finally {
                              setReceiptDownloadingId(null);
                            }
                          })();
                        }}
                      />
                      {r.isActive ? (
                        <CompactButton
                          label="Deactivate"
                          outline
                          onPress={() => {
                            Alert.alert('Deactivate receipt?', r.receiptNumber, [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Deactivate',
                                style: 'destructive',
                                onPress: () => void fees.removeReceipt(r.receiptId),
                              },
                            ]);
                          }}
                        />
                      ) : null}
                    </View>
                  </View>
                  <Text style={[styles.amountSuccess, { color: theme.colors.success }]}>
                    {currency(r.amount)}
                  </Text>
                </View>
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
        classOptions={fees.classOptions}
        restrictedClassId={fees.restrictedClassId}
        busy={fees.actionBusy}
        loadAssignmentsForClass={fees.loadAssignmentsForClass}
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

      {/* Admin: structure / fee types / receipt modals */}
      <Modal
        visible={structureModal}
        animationType="slide"
        onRequestClose={() => setStructureModal(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingStructure ? 'Edit Fee Structure' : 'New Fee Structure'}
            </Text>
            <TouchableOpacity onPress={() => setStructureModal(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            {fees.academicYearLabel ? (
              <View
                style={[
                  styles.ayBanner,
                  { backgroundColor: `${theme.colors.primary}18`, borderColor: theme.colors.border },
                ]}
              >
                <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13 }}>
                  Academic Year: {fees.academicYearLabel}
                </Text>
              </View>
            ) : null}
            <FormField label="Structure Name" required>
              <TextField
                value={structureForm.name}
                onChangeText={(v) => setStructureForm((f) => ({ ...f, name: v }))}
                placeholder="e.g. Annual Tuition Fee"
              />
            </FormField>
            <FormField label="Fee Type" required>
              <SelectField
                options={fees.feeTypes.map((t) => ({ label: t.name, value: String(t.id) }))}
                value={structureForm.feeTypeId || null}
                onChange={(v) => setStructureForm((f) => ({ ...f, feeTypeId: v }))}
                placeholder="Select fee type"
              />
            </FormField>
            <FormField label="Amount (₹)">
              <TextField
                value={structureForm.amount}
                onChangeText={(v) => setStructureForm((f) => ({ ...f, amount: v }))}
                keyboardType="numeric"
              />
            </FormField>
            <FormField label="Frequency">
              <SelectField
                options={FEE_FREQUENCIES.map((f) => ({
                  label: f.replace(/_/g, ' '),
                  value: f,
                }))}
                value={structureForm.frequency}
                onChange={(v) => setStructureForm((f) => ({ ...f, frequency: v }))}
              />
            </FormField>
            <FormField label="Due Day (1–31)">
              <TextField
                value={structureForm.dueDay}
                onChangeText={(v) => setStructureForm((f) => ({ ...f, dueDay: v }))}
                keyboardType="numeric"
              />
            </FormField>
            <FormField label="Late Fee / Day (₹)">
              <TextField
                value={structureForm.lateFeePerDay}
                onChangeText={(v) => setStructureForm((f) => ({ ...f, lateFeePerDay: v }))}
                keyboardType="numeric"
              />
            </FormField>
            <FormField
              label={editingStructure ? 'Class' : 'Classes'}
              hint={editingStructure ? undefined : 'Select multiple — one record per class'}
            >
              {!editingStructure ? (
                <SearchBar
                  value={structureForm.classSearch}
                  onChangeText={(v) => setStructureForm((f) => ({ ...f, classSearch: v }))}
                  placeholder="Search class…"
                />
              ) : null}
              {editingStructure ? (
                <SelectField
                  options={fees.classOptions.map((c) => ({ label: c.name, value: String(c.id) }))}
                  value={structureForm.classIds[0] != null ? String(structureForm.classIds[0]) : null}
                  onChange={(v) =>
                    setStructureForm((f) => ({ ...f, classIds: v ? [Number(v)] : [] }))
                  }
                />
              ) : (
                <View style={styles.classPickList}>
                  {fees.classOptions
                    .filter((c) => {
                      const q = structureForm.classSearch.trim().toLowerCase();
                      return !q || c.name.toLowerCase().includes(q);
                    })
                    .map((c) => {
                      const checked = structureForm.classIds.includes(c.id);
                      return (
                        <TouchableOpacity
                          key={c.id}
                          style={[styles.pickRow, { borderColor: theme.colors.border }]}
                          onPress={() =>
                            setStructureForm((f) => ({
                              ...f,
                              classIds: checked
                                ? f.classIds.filter((id) => id !== c.id)
                                : [...f.classIds, c.id],
                            }))
                          }
                        >
                          <Ionicons
                            name={checked ? 'checkbox' : 'square-outline'}
                            size={20}
                            color={checked ? theme.colors.primary : theme.colors.textSecondary}
                          />
                          <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>
                            {c.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              )}
            </FormField>
            <FormField label="Description (optional)">
              <TextField
                value={structureForm.description}
                onChangeText={(v) => setStructureForm((f) => ({ ...f, description: v }))}
                multiline
              />
            </FormField>
            <PrimaryButton
              label={fees.actionBusy ? 'Saving…' : editingStructure ? 'Update' : 'Create'}
              disabled={fees.actionBusy}
              onPress={() => {
                if (!structureForm.name.trim()) {
                  Alert.alert('Required', 'Structure name is required');
                  return;
                }
                if (!structureForm.feeTypeId) {
                  Alert.alert('Required', 'Fee type is required');
                  return;
                }
                if (!editingStructure && structureForm.classIds.length === 0) {
                  Alert.alert('Required', 'Select at least one class');
                  return;
                }
                void (async () => {
                  const ok = await fees.saveStructure(
                    {
                      name: structureForm.name.trim(),
                      feeTypeId: Number(structureForm.feeTypeId),
                      amount: Number(structureForm.amount) || 0,
                      frequency: structureForm.frequency,
                      dueDay: Math.min(31, Math.max(1, Number(structureForm.dueDay) || 10)),
                      lateFeePerDay: Number(structureForm.lateFeePerDay) || 0,
                      classIds: structureForm.classIds,
                      description: structureForm.description.trim(),
                    },
                    editingStructure?.structureId,
                  );
                  if (ok) setStructureModal(false);
                  else Alert.alert('Save failed', fees.error || 'Could not save structure');
                })();
              }}
            />
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={feeTypesModal}
        animationType="slide"
        onRequestClose={() => setFeeTypesModal(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Fee Types</Text>
            <TouchableOpacity onPress={() => setFeeTypesModal(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="New fee type">
              <TextField
                value={newFeeTypeName}
                onChangeText={setNewFeeTypeName}
                placeholder="e.g. Transport Fee"
              />
            </FormField>
            <CompactButton
              label={fees.actionBusy ? 'Adding…' : 'Add Fee Type'}
              onPress={() => {
                void (async () => {
                  const ok = await fees.createFeeType(newFeeTypeName);
                  if (ok) setNewFeeTypeName('');
                  else Alert.alert('Failed', fees.error || 'Could not create fee type');
                })();
              }}
            />
            {fees.feeTypes.length === 0 ? (
              <EmptyState
                icon="settings-outline"
                title="No fee types"
                message="Add a fee type to use in structures."
              />
            ) : (
              fees.feeTypes.map((t) => (
                <View
                  key={t.id}
                  style={[styles.pickRow, { borderColor: theme.colors.border, justifyContent: 'space-between' }]}
                >
                  <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>{t.name}</Text>
                  <CompactButton
                    label="Delete"
                    outline
                    onPress={() => {
                      Alert.alert('Delete fee type?', t.name, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => void fees.removeFeeType(t.id),
                        },
                      ]);
                    }}
                  />
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={receiptModal}
        animationType="slide"
        onRequestClose={() => setReceiptModal(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingReceipt ? 'Edit Receipt' : 'New Receipt'}
            </Text>
            <TouchableOpacity onPress={() => setReceiptModal(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="Collection ID" required>
              <TextField
                value={receiptForm.collectionId}
                onChangeText={(v) => setReceiptForm((f) => ({ ...f, collectionId: v }))}
                keyboardType="numeric"
                placeholder="Enter Collection ID…"
              />
            </FormField>
            {collLookupBusy ? (
              <Text style={{ color: theme.colors.primary, fontSize: 12 }}>Looking up collection…</Text>
            ) : null}
            {collLookupError ? (
              <Text style={{ color: theme.colors.danger, fontSize: 12 }}>⚠ {collLookupError}</Text>
            ) : null}
            {collLookup && !collLookupError ? (
              <View
                style={[
                  styles.ayBanner,
                  { backgroundColor: `${theme.colors.success}18`, borderColor: theme.colors.border },
                ]}
              >
                <Text style={{ color: theme.colors.success, fontWeight: '700', fontSize: 13 }}>
                  ✓ {collLookup.studentName}
                  {collLookup.admissionNo ? ` · ADM ${collLookup.admissionNo}` : ''}
                </Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                  Due {currency(collLookup.amountDue)} · Paid {currency(collLookup.amount)} ·{' '}
                  {collLookup.status}
                </Text>
              </View>
            ) : null}
            <FormField label="Receipt Number" required>
              <TextField
                value={receiptForm.receiptNumber}
                onChangeText={(v) => setReceiptForm((f) => ({ ...f, receiptNumber: v }))}
                placeholder="e.g. RCPT-2026-001"
              />
            </FormField>
            <FormField label="Amount (₹)" required>
              <TextField
                value={receiptForm.amount}
                onChangeText={(v) => setReceiptForm((f) => ({ ...f, amount: v }))}
                keyboardType="numeric"
              />
            </FormField>
            {collLookup ? (
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: -4 }}>
                Auto-filled from collection · you may adjust if needed
              </Text>
            ) : null}
            <FormField label="Payment Method">
              <SelectField
                options={PAYMENT_METHODS.map((m) => ({
                  label: m.replace(/_/g, ' '),
                  value: m,
                }))}
                value={receiptForm.paymentMethod}
                onChange={(v) => setReceiptForm((f) => ({ ...f, paymentMethod: v }))}
              />
            </FormField>
            <FormField label="Payment Date">
              <TextField
                value={receiptForm.paymentDate}
                onChangeText={(v) => setReceiptForm((f) => ({ ...f, paymentDate: v }))}
                placeholder="YYYY-MM-DD"
              />
            </FormField>
            <FormField label="Remarks (optional)">
              <TextField
                value={receiptForm.remarks}
                onChangeText={(v) => setReceiptForm((f) => ({ ...f, remarks: v }))}
                multiline
              />
            </FormField>
            <PrimaryButton
              label={fees.actionBusy ? 'Saving…' : editingReceipt ? 'Update' : 'Create'}
              disabled={fees.actionBusy || !!collLookupError || collLookupBusy}
              onPress={() => {
                if (!receiptForm.collectionId || !receiptForm.receiptNumber.trim()) {
                  Alert.alert('Required', 'Collection ID and receipt number are required');
                  return;
                }
                if (!Number(receiptForm.amount)) {
                  Alert.alert('Required', 'Amount is required');
                  return;
                }
                void (async () => {
                  const ok = await fees.saveReceipt(
                    {
                      collectionId: Number(receiptForm.collectionId),
                      receiptNumber: receiptForm.receiptNumber.trim(),
                      amount: Number(receiptForm.amount) || 0,
                      paymentMethod: receiptForm.paymentMethod,
                      paymentDate: receiptForm.paymentDate,
                      remarks: receiptForm.remarks.trim(),
                    },
                    editingReceipt?.receiptId,
                  );
                  if (ok) setReceiptModal(false);
                  else Alert.alert('Save failed', fees.error || 'Could not save receipt');
                })();
              }}
            />
          </ScrollView>
        </View>
      </Modal>

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
  classOptions,
  restrictedClassId,
  busy,
  loadAssignmentsForClass,
  pendingTermForAssignment,
  onClose,
  onSave,
}: {
  visible: boolean;
  editing: FeeCollectionRow | null;
  classOptions: Array<{ id: number; name: string }>;
  restrictedClassId?: number;
  busy: boolean;
  loadAssignmentsForClass: (classId: number) => Promise<FeeAssignmentRow[]>;
  pendingTermForAssignment: (assignment: FeeAssignmentRow) => Promise<FeeTermRow | null>;
  onClose: () => void;
  onSave: (form: CollectionFormInput) => Promise<void>;
}) {
  const theme = useTeacherTheme();
  const [selClassId, setSelClassId] = useState<number | undefined>(restrictedClassId);
  const [classAssignments, setClassAssignments] = useState<FeeAssignmentRow[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [selAssignment, setSelAssignment] = useState<FeeAssignmentRow | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [termLabel, setTermLabel] = useState('');
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

  const activeClassId = restrictedClassId ?? selClassId;
  const paidNum = Number(amountPaid) || 0;
  const dueNum = Number(amountDue) || 0;
  const derivedStatus =
    paidNum <= 0 ? 'pending' : paidNum >= dueNum ? 'paid' : 'partial';

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
      setSelAssignment(null);
      setStudentSearch('');
    } else {
      setSelClassId(restrictedClassId);
      setClassAssignments([]);
      setSelAssignment(null);
      setStudentSearch('');
      setTermLabel('');
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
  }, [visible, editing, restrictedClassId]);

  useEffect(() => {
    if (!visible || editing || !activeClassId) {
      if (!activeClassId) setClassAssignments([]);
      return;
    }
    setAssignLoading(true);
    void loadAssignmentsForClass(activeClassId)
      .then(setClassAssignments)
      .finally(() => setAssignLoading(false));
  }, [visible, editing, activeClassId, loadAssignmentsForClass]);

  useEffect(() => {
    if (!visible || editing || !selAssignment) return;
    setFeeStructureId(selAssignment.feeStructureId);
    void pendingTermForAssignment(selAssignment).then((term) => {
      if (term) {
        setTermId(Number(term.id));
        setTermLabel(term.termLabel);
        setAmountDue(String(term.amountDue));
        setDueDate(term.dueDate);
      } else {
        setTermId(undefined);
        setTermLabel('');
        setAmountDue(String(selAssignment.totalFee));
        setDueDate('');
      }
    });
  }, [selAssignment, visible, editing, pendingTermForAssignment]);

  const filteredStudents = classAssignments.filter((a) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.trim().toLowerCase();
    return (
      a.studentName.toLowerCase().includes(q) ||
      a.admissionNo.toLowerCase().includes(q)
    );
  });

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
            <>
              <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
                Step 1 — Select Student
              </Text>
              <FormField label="Class" required>
                <SelectField
                  options={classOptions
                    .filter((c) => !restrictedClassId || c.id === restrictedClassId)
                    .map((c) => ({ label: c.name, value: String(c.id) }))}
                  value={activeClassId != null ? String(activeClassId) : null}
                  onChange={(v) => {
                    setSelClassId(v ? Number(v) : undefined);
                    setSelAssignment(null);
                    setStudentSearch('');
                  }}
                  placeholder="— Select Class —"
                />
              </FormField>

              {activeClassId ? (
                <FormField label="Student" required>
                  {selAssignment ? (
                    <View style={[styles.pickRow, { borderColor: theme.colors.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>
                          {selAssignment.studentName}
                        </Text>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                          ADM {selAssignment.admissionNo} · {selAssignment.className}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setSelAssignment(null);
                          setStudentSearch('');
                        }}
                      >
                        <Ionicons name="close-circle" size={22} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <SearchBar
                        value={studentSearch}
                        onChangeText={setStudentSearch}
                        placeholder={
                          assignLoading ? 'Loading students…' : 'Search by name or ADM #…'
                        }
                      />
                      {assignLoading ? (
                        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 8 }} />
                      ) : (
                        filteredStudents.map((a) => (
                          <TouchableOpacity
                            key={a.id}
                            style={[styles.pickRow, { borderColor: theme.colors.border }]}
                            onPress={() => {
                              setSelAssignment(a);
                              setStudentSearch('');
                              setAmountPaid('0');
                              setFine('0');
                            }}
                          >
                            <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>
                              {a.studentName}
                            </Text>
                            <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                              ADM {a.admissionNo}
                            </Text>
                          </TouchableOpacity>
                        ))
                      )}
                      {!assignLoading && filteredStudents.length === 0 ? (
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                          No fee-assigned students in this class.
                        </Text>
                      ) : null}
                    </>
                  )}
                </FormField>
              ) : null}

              {selAssignment ? (
                <>
                  <View
                    style={[
                      styles.ayBanner,
                      {
                        backgroundColor: `${theme.colors.primary}14`,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <Text style={{ fontWeight: '700', color: theme.colors.primary, fontSize: 13 }}>
                      Fee Summary — {selAssignment.studentName}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                      ADM {selAssignment.admissionNo} · {selAssignment.className} ·{' '}
                      {selAssignment.frequency}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                      Total fee {currency(selAssignment.totalFee)}
                      {termLabel ? ` · Term ${termLabel}` : ''}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.danger,
                        fontWeight: '800',
                        fontSize: 15,
                        marginTop: 6,
                      }}
                    >
                      Amount due: {currency(dueNum)}
                    </Text>
                  </View>

                  <Text style={[styles.sectionHeading, { color: theme.colors.textPrimary }]}>
                    Step 2 — Payment Details
                  </Text>
                  <FormField label="Amount Paying (₹)" required>
                    <TextField
                      value={amountPaid}
                      onChangeText={setAmountPaid}
                      keyboardType="numeric"
                    />
                  </FormField>
                  {paidNum > 0 ? (
                    <Text
                      style={{
                        color: paidNum >= dueNum ? theme.colors.success : theme.colors.warning,
                        fontSize: 12,
                        fontWeight: '600',
                      }}
                    >
                      {paidNum >= dueNum
                        ? `Fully paid · Status: ${derivedStatus}`
                        : `Partial — ${currency(dueNum - paidNum)} remaining · ${derivedStatus}`}
                    </Text>
                  ) : null}
                  <FormField label="Late Fee (₹)" hint="Recorded separately — does not change term fee">
                    <TextField value={fine} onChangeText={setFine} keyboardType="numeric" />
                  </FormField>
                  <FormField label="Payment Method">
                    <SelectField
                      options={PAYMENT_METHODS.map((m) => ({
                        label: m.replace(/_/g, ' '),
                        value: m,
                      }))}
                      value={method}
                      onChange={setMethod}
                    />
                  </FormField>
                  <DateField label="Payment date" value={paymentDate} onChange={setPaymentDate} />
                  <FormField label="Transaction Ref">
                    <TextField value={txn} onChangeText={setTxn} placeholder="Optional" />
                  </FormField>
                  <FormField label="Remarks">
                    <TextField value={remarks} onChangeText={setRemarks} multiline />
                  </FormField>
                  <PrimaryButton
                    label={busy ? 'Saving…' : 'Save Collection'}
                    icon="save-outline"
                    loading={busy}
                    onPress={() => {
                      if (!selAssignment) {
                        Alert.alert('Required', 'Select a student');
                        return;
                      }
                      void onSave({
                        studentId: selAssignment.studentId,
                        feeStructureId,
                        termScheduleId: termId,
                        amountDue: dueNum,
                        amountPaid: paidNum,
                        fine: Number(fine) || 0,
                        paymentMethod: method,
                        paymentDate,
                        dueDate,
                        transactionRef: txn,
                        remarks,
                      });
                    }}
                  />
                </>
              ) : (
                <CompactButton label="Cancel" outline onPress={onClose} style={{ marginTop: 8 }} />
              )}
            </>
          ) : (
            <>
              <FormField label="Student">
                <Text style={{ fontWeight: '700', fontSize: 16, color: theme.colors.textPrimary }}>
                  {editing.studentName}
                </Text>
              </FormField>
              <FormField label="Amount Paid (₹)">
                <TextField value={amountPaid} onChangeText={setAmountPaid} keyboardType="numeric" />
              </FormField>
              <FormField label="Late Fee / Fine (₹)">
                <TextField value={fine} onChangeText={setFine} keyboardType="numeric" />
              </FormField>
              <FormField label="Payment Method">
                <SelectField
                  options={PAYMENT_METHODS.map((m) => ({
                    label: m.replace(/_/g, ' '),
                    value: m,
                  }))}
                  value={method}
                  onChange={setMethod}
                />
              </FormField>
              <FormField label="Status">
                <SelectField
                  options={COLLECTION_STATUSES.map((s) => ({ label: s, value: s }))}
                  value={status}
                  onChange={setStatus}
                />
              </FormField>
              <DateField label="Payment date" value={paymentDate} onChange={setPaymentDate} />
              <FormField label="Transaction Ref">
                <TextField value={txn} onChangeText={setTxn} />
              </FormField>
              <FormField label="Remarks">
                <TextField value={remarks} onChangeText={setRemarks} multiline />
              </FormField>
              <PrimaryButton
                label={busy ? 'Saving…' : 'Save'}
                icon="save-outline"
                loading={busy}
                onPress={() => {
                  void onSave({
                    studentId: editing.studentId,
                    feeStructureId,
                    termScheduleId: termId,
                    amountDue: Number(amountDue) || editing.amountDue,
                    amountPaid: Number(amountPaid) || 0,
                    fine: Number(fine) || 0,
                    paymentMethod: method,
                    paymentDate,
                    dueDate,
                    transactionRef: txn,
                    remarks,
                    status,
                  });
                }}
              />
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14, paddingBottom: 32 },
  errorText: { fontSize: 13, fontWeight: '500' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  ayBanner: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  classPickList: { maxHeight: 220, gap: 6, marginTop: 8 },
  slipCard: {
    marginHorizontal: 12,
    marginVertical: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  trendSnap: { gap: 8 },
  trendStatRow: { flexDirection: 'row', gap: 8 },
  trendStat: { flex: 1, gap: 2 },
  trendStatValue: { fontSize: 15, fontWeight: '800' },
  trendStatLabel: { fontSize: 11, fontWeight: '500', lineHeight: 14 },
  trendDayList: { marginTop: 8, gap: 8 },
  trendDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

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
