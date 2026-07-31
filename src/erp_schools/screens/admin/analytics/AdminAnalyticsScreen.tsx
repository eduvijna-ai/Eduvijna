/**
 * Analytics hub — web AnalyticsTab parity.
 * Tabs: Report Templates | Snapshots | Widgets | School Documents
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  examAllItemsApi,
  examResultsApi,
  schoolManagementApi,
  studentsByUserApi,
} from '@core/api/erp.api';
import { useUserStore } from '@core/store/user.store';
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
  ScreenLoader,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useAcademicYear } from '../../../contexts/AcademicYearContext';
import {
  useAdminAnalyticsData,
  type AdminAnalyticsTab,
  type ReportTemplateRow,
  type ReportSnapshotRow,
  type DashboardWidgetRow,
} from '../../../hooks/useAdminAnalyticsData';
import { useAdminNavigation } from '../../../hooks/useAdminNavigation';
import {
  REPORT_TYPES,
  CHART_TYPES,
  SNAPSHOT_FORMATS,
  WIDGET_TYPES,
  WIDGET_SIZES,
  ACADEMIC_CATALOG,
  CERTIFICATE_CATALOG,
  RECEIPT_CATALOG,
  accentColor,
  type DocumentCategory,
  type AcademicDocId,
  type CertificateKind,
  type ReceiptKind,
} from '../../../utils/analyticsMeta';
import {
  mapSchoolToProfile,
  printAcademicDocument,
  printCertificateDocument,
  studentPrintInfoFromByUser,
  studentPrintInfoFromExamResult,
  type SchoolPrintProfile,
} from '../../../utils/schoolDocumentsPdf';
import {
  extractErrorMessage,
  pickNumber,
  pickString,
  safeList,
} from '../../../utils/apiHelpers';
import { resolveSchoolNameFromUser } from '../../../utils/adminDashboardMeta';

const ANALYTICS_TABS: Array<{
  key: AdminAnalyticsTab;
  title: string;
  subtitle: string;
}> = [
  {
    key: 'templates',
    title: 'Report Templates',
    subtitle: 'Define reusable report configurations.',
  },
  {
    key: 'snapshots',
    title: 'Snapshots',
    subtitle: 'Generated report outputs and exports.',
  },
  {
    key: 'widgets',
    title: 'Widgets',
    subtitle: 'Dashboard KPI and chart widgets.',
  },
  {
    key: 'documents',
    title: 'School Documents',
    subtitle: 'Report cards, certificates, and receipt templates.',
  },
];

function CompactBtn({
  label,
  onPress,
  outline,
  icon,
  danger,
  disabled,
}: {
  label: string;
  onPress: () => void;
  outline?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  danger?: boolean;
  disabled?: boolean;
}) {
  const theme = useTeacherTheme();
  const border = danger ? theme.colors.danger : theme.colors.primary;
  const bg = outline
    ? theme.colors.surface
    : danger
      ? theme.colors.danger
      : theme.colors.primary;
  const fg = outline ? border : theme.colors.textInverse;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
      style={[
        styles.compactBtn,
        { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.55 : 1 },
      ]}
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
  if (total <= 0 || pages <= 1) return null;
  return (
    <View style={styles.pageRow}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, flex: 1 }}>
        Page {page}/{pages} ({total})
      </Text>
      <CompactBtn label="Prev" outline onPress={onPrev} />
      <CompactBtn label="Next" outline onPress={onNext} />
    </View>
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
      <Text style={{ color: theme.colors.textPrimary, fontSize: 14, fontWeight: '600' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function AdminAnalyticsScreen() {
  const theme = useTeacherTheme();
  const navigation = useAdminNavigation();
  const analytics = useAdminAnalyticsData();
  const { selectedYearId, selectedYear } = useAcademicYear();
  const user = useUserStore((s) => s.user);
  const [tab, setTab] = useState<AdminAnalyticsTab>('templates');

  const [templateModal, setTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplateRow | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    reportType: 'custom',
    module: '',
    chartType: '',
    queryConfigText: '{}',
    columnsText: '[]',
    filtersText: '{}',
    isSystem: false,
  });

  const [snapshotModal, setSnapshotModal] = useState(false);
  const [editingSnapshot, setEditingSnapshot] = useState<ReportSnapshotRow | null>(null);
  const [snapshotForm, setSnapshotForm] = useState({
    templateId: '',
    title: '',
    format: 'json',
    reportDataText: '{}',
    summaryText: '{}',
    parametersText: '{}',
    fileUrl: '',
  });

  const [widgetModal, setWidgetModal] = useState(false);
  const [editingWidget, setEditingWidget] = useState<DashboardWidgetRow | null>(null);
  const [widgetForm, setWidgetForm] = useState({
    title: '',
    widgetType: 'kpi',
    module: '',
    configText: '{}',
    size: 'medium',
    position: '0',
  });

  // School documents state
  const [docCategory, setDocCategory] = useState<DocumentCategory>('academic');
  const [profile, setProfile] = useState<SchoolPrintProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [students, setStudents] = useState<Record<string, unknown>[]>([]);
  const [exams, setExams] = useState<Array<{ id: number; name: string }>>([]);
  const [studentKey, setStudentKey] = useState('');
  const [examId, setExamId] = useState('');
  const [docBusy, setDocBusy] = useState(false);

  const yearLabel = selectedYear?.name || 'Current Academic Year';

  const loadPrintProfile = useCallback(async () => {
    if (!analytics.schoolId) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    setProfileError(null);
    try {
      let school: Record<string, unknown> | null = null;
      try {
        const mine = (await schoolManagementApi.getMySchool()) as Record<string, unknown>;
        if (pickNumber(mine.school_id) === analytics.schoolId) school = mine;
      } catch {
        /* fall through */
      }
      if (!school) {
        school = (await schoolManagementApi.getById(analytics.schoolId)) as Record<
          string,
          unknown
        >;
      }
      setProfile(mapSchoolToProfile(school, yearLabel));
    } catch (e) {
      const fallbackName = resolveSchoolNameFromUser(user) || 'School';
      setProfile({
        schoolId: analytics.schoolId,
        schoolName: fallbackName,
        addressLine: '—',
        cityStatePin: '—',
        academicYearLabel: yearLabel,
      });
      setProfileError(extractErrorMessage(e, 'Failed to load school branding'));
    } finally {
      setProfileLoading(false);
    }
  }, [analytics.schoolId, yearLabel, user]);

  const loadDocLookups = useCallback(async () => {
    if (!selectedYearId && !analytics.schoolId) return;
    try {
      if (selectedYearId) {
        const raw = await studentsByUserApi.getAll({ academic_year_id: selectedYearId });
        setStudents(safeList<Record<string, unknown>>(raw));
      }
    } catch {
      setStudents([]);
    }
    try {
      if (analytics.schoolId) {
        const raw = await examAllItemsApi.list(analytics.schoolId);
        const items = safeList<Record<string, unknown>>(raw).map((ex) => ({
          id: pickNumber(ex.id),
          name: pickString(ex.name, `Exam #${pickNumber(ex.id)}`),
        }));
        setExams(items.filter((e) => e.id > 0));
      }
    } catch {
      setExams([]);
    }
  }, [selectedYearId, analytics.schoolId]);

  useEffect(() => {
    if (tab !== 'documents') return;
    void loadPrintProfile();
    void loadDocLookups();
  }, [tab, loadPrintProfile, loadDocLookups]);

  const selectedStudent = useMemo(() => {
    return students.find(
      (s) => String(s.profile_id ?? s.user_id) === studentKey,
    );
  }, [students, studentKey]);

  const openTemplateCreate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      description: '',
      reportType: 'custom',
      module: '',
      chartType: '',
      queryConfigText: '{}',
      columnsText: '[]',
      filtersText: '{}',
      isSystem: false,
    });
    setTemplateModal(true);
  };

  const openTemplateEdit = (item: ReportTemplateRow) => {
    setEditingTemplate(item);
    setTemplateForm({
      name: item.name,
      description: item.description,
      reportType: item.reportType || 'custom',
      module: item.module,
      chartType: item.chartType,
      queryConfigText: JSON.stringify(item.queryConfig || {}, null, 2),
      columnsText: JSON.stringify(item.columns || [], null, 2),
      filtersText: JSON.stringify(item.filters || {}, null, 2),
      isSystem: item.isSystem,
    });
    setTemplateModal(true);
  };

  const openSnapshotCreate = () => {
    setEditingSnapshot(null);
    setSnapshotForm({
      templateId: '',
      title: '',
      format: 'json',
      reportDataText: '{}',
      summaryText: '{}',
      parametersText: '{}',
      fileUrl: '',
    });
    setSnapshotModal(true);
  };

  const openSnapshotEdit = (item: ReportSnapshotRow) => {
    setEditingSnapshot(item);
    setSnapshotForm({
      templateId: item.templateId != null ? String(item.templateId) : '',
      title: item.title,
      format: item.format || 'json',
      reportDataText: JSON.stringify(item.reportData || {}, null, 2),
      summaryText: JSON.stringify(item.summary || {}, null, 2),
      parametersText: JSON.stringify(item.parameters || {}, null, 2),
      fileUrl: item.fileUrl,
    });
    setSnapshotModal(true);
  };

  const openWidgetCreate = () => {
    setEditingWidget(null);
    setWidgetForm({
      title: '',
      widgetType: 'kpi',
      module: '',
      configText: '{}',
      size: 'medium',
      position: '0',
    });
    setWidgetModal(true);
  };

  const openWidgetEdit = (item: DashboardWidgetRow) => {
    setEditingWidget(item);
    setWidgetForm({
      title: item.title,
      widgetType: item.widgetType || 'kpi',
      module: item.module,
      configText: JSON.stringify(item.config || {}, null, 2),
      size: item.size || 'medium',
      position: String(item.position ?? 0),
    });
    setWidgetModal(true);
  };

  const confirmDeactivate = (kind: string, onConfirm: () => void) => {
    Alert.alert('Deactivate?', `Deactivate this ${kind}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: onConfirm },
    ]);
  };

  const generateAcademic = async (docId: AcademicDocId) => {
    if (!profile || !selectedStudent) {
      Alert.alert('Select a student first.');
      return;
    }
    const student = studentPrintInfoFromByUser(selectedStudent);
    setDocBusy(true);
    try {
      if (docId === 'transfer_certificate' || docId === 'co_scholastic') {
        await printAcademicDocument({ docId, profile, student });
        return;
      }
      if (!examId) {
        Alert.alert('Select an exam to pull marks from published results.');
        return;
      }
      const results = (await examResultsApi.view(
        Number(examId),
        analytics.schoolId,
      )) as Record<string, unknown>;
      const items = safeList<Record<string, unknown>>(results.items);
      const profileId = pickNumber(selectedStudent.profile_id);
      const adm = pickString(selectedStudent.admission_number);
      const row =
        items.find((r) => pickNumber(r.student_id) === profileId) ??
        items.find(
          (r) =>
            adm &&
            pickString(r.admission_number) &&
            pickString(r.admission_number) === adm,
        );
      if (!row) {
        Alert.alert(
          'No exam result found for this student. Generate/publish results first.',
        );
        return;
      }
      const exam = exams.find((e) => e.id === Number(examId));
      const examTitle = exam?.name || 'Examination';
      const enriched = studentPrintInfoFromExamResult(
        row,
        pickString(selectedStudent.class_name) || undefined,
      );
      await printAcademicDocument({
        docId,
        profile,
        student: enriched,
        examTitle,
        result: row,
      });
    } catch (e) {
      if (!(e instanceof Error && e.message.includes('Select an exam'))) {
        Alert.alert(
          'Failed',
          e instanceof Error ? e.message : 'Failed to generate document',
        );
      }
    } finally {
      setDocBusy(false);
    }
  };

  const generateCertificate = async (kind: CertificateKind) => {
    if (!profile || !selectedStudent) {
      Alert.alert('Select a student first.');
      return;
    }
    setDocBusy(true);
    try {
      const student = studentPrintInfoFromByUser(selectedStudent);
      await printCertificateDocument(kind, profile, student);
    } catch {
      /* alerted in util */
    } finally {
      setDocBusy(false);
    }
  };

  const showReceiptHint = (kind: ReceiptKind) => {
    const title =
      RECEIPT_CATALOG.find((r) => r.kind === kind)?.title || 'receipt';
    Alert.alert(
      'Where to print',
      `Open Fees → Receipts, select a payment, and use View / Print for a ${title}. Receipt data is loaded from fee collections in the database.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Fees',
          onPress: () => navigation.navigate('FeeCollection'),
        },
      ],
    );
  };

  if (analytics.status === 'idle' || analytics.status === 'loading') {
    return (
      <TeacherScreen>
        <ScreenLoader message="Loading analytics…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={<ScreenHeader title="Analytics" />}
      contentStyle={styles.content}
    >
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' }}>
        Insights
      </Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
        Build report templates, generate snapshots, and configure dashboard widgets.
      </Text>

      {analytics.error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{analytics.error}</Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRail}
      >
        {ANALYTICS_TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[
                styles.tabCard,
                {
                  backgroundColor: active
                    ? theme.colors.primary
                    : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <Text
                style={{
                  fontWeight: '800',
                  fontSize: 13,
                  color: active ? theme.colors.textInverse : theme.colors.textPrimary,
                }}
              >
                {t.title}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  marginTop: 4,
                  color: active ? 'rgba(255,255,255,0.85)' : theme.colors.textSecondary,
                }}
                numberOfLines={2}
              >
                {t.subtitle}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ─── Templates ─── */}
      {tab === 'templates' ? (
        <View style={styles.section}>
          <SelectField
            options={[
              { label: 'All Types', value: '' },
              ...REPORT_TYPES.map((t) => ({ label: t, value: t })),
            ]}
            value={analytics.typeFilter}
            onChange={analytics.setTypeFilter}
            placeholder="All Types"
          />
          <CompactBtn
            label="Create Template"
            icon="add"
            onPress={openTemplateCreate}
          />
          {analytics.templates.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="No templates"
              message="Create a reusable report template to get started."
            />
          ) : (
            analytics.templates.map((item) => (
              <SurfaceCard key={item.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {item.name}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      ID {item.id} · Module {item.module || '—'} · Chart{' '}
                      {item.chartType || '—'}
                    </Text>
                    <View style={styles.badgeRow}>
                      <Badge label={item.reportType || '—'} accent="purple" />
                      {item.isSystem ? (
                        <Badge label="System" accent="teal" />
                      ) : null}
                    </View>
                  </View>
                  <View style={{ gap: 6 }}>
                    <CompactBtn label="Edit" outline onPress={() => openTemplateEdit(item)} />
                    {item.isActive ? (
                      <CompactBtn
                        label="Deactivate"
                        outline
                        danger
                        onPress={() =>
                          confirmDeactivate('template', () => {
                            void analytics.removeTemplate(item.id);
                          })
                        }
                      />
                    ) : null}
                  </View>
                </View>
              </SurfaceCard>
            ))
          )}
          <PageRow
            page={analytics.templatePage}
            pages={analytics.templatePages}
            total={analytics.templateTotal}
            onPrev={() =>
              analytics.setTemplatePage(Math.max(1, analytics.templatePage - 1))
            }
            onNext={() =>
              analytics.setTemplatePage(
                Math.min(analytics.templatePages, analytics.templatePage + 1),
              )
            }
          />
        </View>
      ) : null}

      {/* ─── Snapshots ─── */}
      {tab === 'snapshots' ? (
        <View style={styles.section}>
          <SelectField
            options={[
              { label: 'All Formats', value: '' },
              ...SNAPSHOT_FORMATS.map((f) => ({
                label: f.toUpperCase(),
                value: f,
              })),
            ]}
            value={analytics.formatFilter}
            onChange={analytics.setFormatFilter}
            placeholder="All Formats"
          />
          <CompactBtn
            label="Generate Snapshot"
            icon="add"
            onPress={openSnapshotCreate}
          />
          {analytics.snapshots.length === 0 ? (
            <EmptyState
              icon="camera-outline"
              title="No snapshots"
              message="Generate a report snapshot to export outputs."
            />
          ) : (
            analytics.snapshots.map((item) => (
              <SurfaceCard key={item.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {item.title}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      ID {item.id} · Template {item.templateId ?? '—'} ·{' '}
                      {item.createdAt || '—'}
                    </Text>
                    <Badge label={(item.format || 'json').toUpperCase()} accent="blue" />
                  </View>
                  <View style={{ gap: 6 }}>
                    <CompactBtn label="Edit" outline onPress={() => openSnapshotEdit(item)} />
                    {item.isActive ? (
                      <CompactBtn
                        label="Deactivate"
                        outline
                        danger
                        onPress={() =>
                          confirmDeactivate('snapshot', () => {
                            void analytics.removeSnapshot(item.id);
                          })
                        }
                      />
                    ) : null}
                  </View>
                </View>
              </SurfaceCard>
            ))
          )}
          <PageRow
            page={analytics.snapshotPage}
            pages={analytics.snapshotPages}
            total={analytics.snapshotTotal}
            onPrev={() =>
              analytics.setSnapshotPage(Math.max(1, analytics.snapshotPage - 1))
            }
            onNext={() =>
              analytics.setSnapshotPage(
                Math.min(analytics.snapshotPages, analytics.snapshotPage + 1),
              )
            }
          />
        </View>
      ) : null}

      {/* ─── Widgets ─── */}
      {tab === 'widgets' ? (
        <View style={styles.section}>
          <SelectField
            options={[
              { label: 'All Types', value: '' },
              ...WIDGET_TYPES.map((t) => ({ label: t, value: t })),
            ]}
            value={analytics.widgetTypeFilter}
            onChange={analytics.setWidgetTypeFilter}
            placeholder="All Types"
          />
          <CompactBtn label="Add Widget" icon="add" onPress={openWidgetCreate} />
          {analytics.widgets.length === 0 ? (
            <EmptyState
              icon="grid-outline"
              title="No widgets"
              message="Add a dashboard KPI or chart widget."
            />
          ) : (
            analytics.widgets.map((item) => (
              <SurfaceCard key={item.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {item.title}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      ID {item.id} · Module {item.module || '—'} · Size {item.size} ·
                      Pos {item.position}
                    </Text>
                    <Badge label={item.widgetType || '—'} accent="purple" />
                  </View>
                  <View style={{ gap: 6 }}>
                    <CompactBtn label="Edit" outline onPress={() => openWidgetEdit(item)} />
                    {item.isActive ? (
                      <CompactBtn
                        label="Deactivate"
                        outline
                        danger
                        onPress={() =>
                          confirmDeactivate('widget', () => {
                            void analytics.removeWidget(item.id);
                          })
                        }
                      />
                    ) : null}
                  </View>
                </View>
              </SurfaceCard>
            ))
          )}
          <PageRow
            page={analytics.widgetPage}
            pages={analytics.widgetPages}
            total={analytics.widgetTotal}
            onPrev={() =>
              analytics.setWidgetPage(Math.max(1, analytics.widgetPage - 1))
            }
            onNext={() =>
              analytics.setWidgetPage(
                Math.min(analytics.widgetPages, analytics.widgetPage + 1),
              )
            }
          />
        </View>
      ) : null}

      {/* ─── School Documents ─── */}
      {tab === 'documents' ? (
        <View style={styles.section}>
          {profileLoading ? (
            <Text style={{ color: theme.colors.textSecondary }}>Loading school branding…</Text>
          ) : null}
          {profileError ? (
            <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{profileError}</Text>
          ) : null}

          <View style={styles.catRow}>
            {(
              [
                { key: 'academic', label: 'Academic Reports' },
                { key: 'certificates', label: 'Certificates' },
                { key: 'receipts', label: 'Receipt Templates' },
              ] as const
            ).map((c) => {
              const active = docCategory === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  onPress={() => setDocCategory(c.key)}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: active
                        ? theme.colors.primary
                        : theme.colors.surface,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: active
                        ? theme.colors.textInverse
                        : theme.colors.textPrimary,
                    }}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {(docCategory === 'academic' || docCategory === 'certificates') && (
            <View style={{ gap: 10 }}>
              <FormField label="Student">
                <SelectField
                  options={[
                    { label: 'Select student…', value: '' },
                    ...students.map((s) => ({
                      label: `${pickString(s.name) || pickString(s.username)} — ${pickString(s.class_name)} ${pickString(s.section_name)}`.trim(),
                      value: String(s.profile_id ?? s.user_id),
                    })),
                  ]}
                  value={studentKey}
                  onChange={setStudentKey}
                  placeholder="Select student…"
                />
              </FormField>
              {docCategory === 'academic' ? (
                <FormField label="Exam (for marks-based reports)">
                  <SelectField
                    options={[
                      { label: 'Select exam…', value: '' },
                      ...exams.map((ex) => ({
                        label: ex.name || `Exam #${ex.id}`,
                        value: String(ex.id),
                      })),
                    ]}
                    value={examId}
                    onChange={setExamId}
                    placeholder="Select exam…"
                  />
                </FormField>
              ) : null}
            </View>
          )}

          {docCategory === 'academic'
            ? ACADEMIC_CATALOG.map((item) => (
                <SurfaceCard key={item.id}>
                  <View
                    style={[
                      styles.docAccent,
                      { backgroundColor: accentColor(item.accent) },
                    ]}
                  />
                  <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                    {item.title}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: 12,
                      marginVertical: 6,
                    }}
                  >
                    {item.description}
                  </Text>
                  <CompactBtn
                    label="View / Print"
                    disabled={docBusy || !profile}
                    onPress={() => {
                      void generateAcademic(item.id);
                    }}
                  />
                </SurfaceCard>
              ))
            : null}

          {docCategory === 'certificates'
            ? CERTIFICATE_CATALOG.map((item) => (
                <SurfaceCard key={item.kind}>
                  <View
                    style={[
                      styles.docAccent,
                      { backgroundColor: accentColor(item.accent) },
                    ]}
                  />
                  <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                    {item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
                      {item.subtitle}
                    </Text>
                  ) : null}
                  <View style={{ marginTop: 8 }}>
                    <CompactBtn
                      label="View / Print"
                      disabled={docBusy || !profile}
                      onPress={() => {
                        void generateCertificate(item.kind);
                      }}
                    />
                  </View>
                </SurfaceCard>
              ))
            : null}

          {docCategory === 'receipts' ? (
            <>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                Fee receipts are generated from real payment records. Issue or open a
                receipt under Fees → Receipts to view, print, or download in the
                matching template below.
              </Text>
              {RECEIPT_CATALOG.map((r) => (
                <SurfaceCard key={r.kind}>
                  <View
                    style={[
                      styles.docAccent,
                      { backgroundColor: accentColor(r.accent) },
                    ]}
                  />
                  <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                    {r.title}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
                    {r.section}
                  </Text>
                  <View style={{ marginTop: 8 }}>
                    <CompactBtn
                      label="Where to print"
                      outline
                      onPress={() => showReceiptHint(r.kind)}
                    />
                  </View>
                </SurfaceCard>
              ))}
            </>
          ) : null}

          {docBusy ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 8 }} />
          ) : null}
        </View>
      ) : null}

      {/* Template modal */}
      <Modal
        visible={templateModal}
        animationType="slide"
        onRequestClose={() => setTemplateModal(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingTemplate ? 'Edit Report Template' : 'Create Report Template'}
            </Text>
            <TouchableOpacity onPress={() => setTemplateModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
          >
            <FormField label="Name" required>
              <TextField
                value={templateForm.name}
                onChangeText={(v) => setTemplateForm((f) => ({ ...f, name: v }))}
              />
            </FormField>
            <FormField label="Description">
              <TextField
                value={templateForm.description}
                onChangeText={(v) =>
                  setTemplateForm((f) => ({ ...f, description: v }))
                }
                multiline
              />
            </FormField>
            <FormField label="Report Type">
              <SelectField
                options={REPORT_TYPES.map((t) => ({ label: t, value: t }))}
                value={templateForm.reportType}
                onChange={(v) => setTemplateForm((f) => ({ ...f, reportType: v }))}
              />
            </FormField>
            <FormField label="Module">
              <TextField
                value={templateForm.module}
                onChangeText={(v) => setTemplateForm((f) => ({ ...f, module: v }))}
              />
            </FormField>
            <FormField label="Chart Type">
              <SelectField
                options={[
                  { label: 'None', value: '' },
                  ...CHART_TYPES.map((c) => ({ label: c, value: c })),
                ]}
                value={templateForm.chartType}
                onChange={(v) => setTemplateForm((f) => ({ ...f, chartType: v }))}
              />
            </FormField>
            <FormField label="Query Config (JSON)">
              <TextField
                value={templateForm.queryConfigText}
                onChangeText={(v) =>
                  setTemplateForm((f) => ({ ...f, queryConfigText: v }))
                }
                multiline
                placeholder="{}"
              />
            </FormField>
            <FormField label="Columns (JSON array)">
              <TextField
                value={templateForm.columnsText}
                onChangeText={(v) =>
                  setTemplateForm((f) => ({ ...f, columnsText: v }))
                }
                multiline
                placeholder="[]"
              />
            </FormField>
            <FormField label="Filters (JSON)">
              <TextField
                value={templateForm.filtersText}
                onChangeText={(v) =>
                  setTemplateForm((f) => ({ ...f, filtersText: v }))
                }
                multiline
                placeholder="{}"
              />
            </FormField>
            <CheckRow
              label="System Template"
              checked={templateForm.isSystem}
              onToggle={() =>
                setTemplateForm((f) => ({ ...f, isSystem: !f.isSystem }))
              }
            />
            <PrimaryButton
              label={analytics.busy ? 'Saving…' : 'Save'}
              disabled={analytics.busy}
              onPress={() => {
                void (async () => {
                  const ok = await analytics.saveTemplate(
                    templateForm,
                    editingTemplate?.id,
                  );
                  if (ok) setTemplateModal(false);
                  else if (analytics.error) Alert.alert('Save failed', analytics.error);
                })();
              }}
            />
            <CompactBtn
              label="Cancel"
              outline
              onPress={() => setTemplateModal(false)}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Snapshot modal */}
      <Modal
        visible={snapshotModal}
        animationType="slide"
        onRequestClose={() => setSnapshotModal(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingSnapshot ? 'Edit Snapshot' : 'Generate Snapshot'}
            </Text>
            <TouchableOpacity onPress={() => setSnapshotModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
          >
            <FormField label="Template ID">
              <TextField
                value={snapshotForm.templateId}
                onChangeText={(v) =>
                  setSnapshotForm((f) => ({ ...f, templateId: v }))
                }
                keyboardType="number-pad"
              />
            </FormField>
            <FormField label="Title" required>
              <TextField
                value={snapshotForm.title}
                onChangeText={(v) => setSnapshotForm((f) => ({ ...f, title: v }))}
              />
            </FormField>
            <FormField label="Format">
              <SelectField
                options={SNAPSHOT_FORMATS.map((f) => ({
                  label: f.toUpperCase(),
                  value: f,
                }))}
                value={snapshotForm.format}
                onChange={(v) => setSnapshotForm((f) => ({ ...f, format: v }))}
              />
            </FormField>
            <FormField label="Report Data (JSON)">
              <TextField
                value={snapshotForm.reportDataText}
                onChangeText={(v) =>
                  setSnapshotForm((f) => ({ ...f, reportDataText: v }))
                }
                multiline
              />
            </FormField>
            <FormField label="Summary (JSON)">
              <TextField
                value={snapshotForm.summaryText}
                onChangeText={(v) =>
                  setSnapshotForm((f) => ({ ...f, summaryText: v }))
                }
                multiline
              />
            </FormField>
            <FormField label="Parameters (JSON)">
              <TextField
                value={snapshotForm.parametersText}
                onChangeText={(v) =>
                  setSnapshotForm((f) => ({ ...f, parametersText: v }))
                }
                multiline
              />
            </FormField>
            <FormField label="File URL">
              <TextField
                value={snapshotForm.fileUrl}
                onChangeText={(v) =>
                  setSnapshotForm((f) => ({ ...f, fileUrl: v }))
                }
              />
            </FormField>
            <PrimaryButton
              label={analytics.busy ? 'Saving…' : 'Save'}
              disabled={analytics.busy}
              onPress={() => {
                void (async () => {
                  const ok = await analytics.saveSnapshot(
                    snapshotForm,
                    editingSnapshot?.id,
                  );
                  if (ok) setSnapshotModal(false);
                  else if (analytics.error) Alert.alert('Save failed', analytics.error);
                })();
              }}
            />
            <CompactBtn
              label="Cancel"
              outline
              onPress={() => setSnapshotModal(false)}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Widget modal */}
      <Modal
        visible={widgetModal}
        animationType="slide"
        onRequestClose={() => setWidgetModal(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingWidget ? 'Edit Widget' : 'Add Widget'}
            </Text>
            <TouchableOpacity onPress={() => setWidgetModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
          >
            <FormField label="Title" required>
              <TextField
                value={widgetForm.title}
                onChangeText={(v) => setWidgetForm((f) => ({ ...f, title: v }))}
              />
            </FormField>
            <FormField label="Widget Type">
              <SelectField
                options={WIDGET_TYPES.map((t) => ({ label: t, value: t }))}
                value={widgetForm.widgetType}
                onChange={(v) => setWidgetForm((f) => ({ ...f, widgetType: v }))}
              />
            </FormField>
            <FormField label="Module" hint="attendance, academic, etc.">
              <TextField
                value={widgetForm.module}
                onChangeText={(v) => setWidgetForm((f) => ({ ...f, module: v }))}
                placeholder="attendance, academic, etc."
              />
            </FormField>
            <FormField label="Config (JSON)">
              <TextField
                value={widgetForm.configText}
                onChangeText={(v) =>
                  setWidgetForm((f) => ({ ...f, configText: v }))
                }
                multiline
              />
            </FormField>
            <FormField label="Size">
              <SelectField
                options={WIDGET_SIZES.map((s) => ({ label: s, value: s }))}
                value={widgetForm.size}
                onChange={(v) => setWidgetForm((f) => ({ ...f, size: v }))}
              />
            </FormField>
            <FormField label="Position">
              <TextField
                value={widgetForm.position}
                onChangeText={(v) =>
                  setWidgetForm((f) => ({ ...f, position: v }))
                }
                keyboardType="number-pad"
              />
            </FormField>
            <PrimaryButton
              label={analytics.busy ? 'Saving…' : 'Save'}
              disabled={analytics.busy}
              onPress={() => {
                void (async () => {
                  const ok = await analytics.saveWidget(
                    widgetForm,
                    editingWidget?.id,
                  );
                  if (ok) setWidgetModal(false);
                  else if (analytics.error) Alert.alert('Save failed', analytics.error);
                })();
              }}
            />
            <CompactBtn label="Cancel" outline onPress={() => setWidgetModal(false)} />
          </ScrollView>
        </View>
      </Modal>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12, paddingBottom: 28 },
  tabRail: { gap: 10, paddingVertical: 4 },
  tabCard: {
    width: 200,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  section: { gap: 10 },
  listRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  rowName: { fontSize: 15, fontWeight: '800' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  compactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  pageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', flex: 1, paddingRight: 12 },
  modalBody: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  docAccent: {
    height: 3,
    borderRadius: 2,
    marginBottom: 8,
    alignSelf: 'stretch',
  },
});
