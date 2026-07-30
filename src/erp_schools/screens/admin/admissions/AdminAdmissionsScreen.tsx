/**
 * Admissions Operations Desk hub — web AdmissionsTab parity.
 * Tabs: Enquiries | Visitor Register | Front Office | Incidents | Emergency Contacts
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  Linking,
  Dimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
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
  FilterChips,
  StatGrid,
  type ChipOption,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useAdminAdmissionsData,
  type AdminAdmissionsTab,
  type EnquiryRow,
  type VisitorRow,
  type IncidentRow,
  type EmergencyContactRow,
  type PhoneCallRow,
  type PostalDispatchRow,
  type PostalReceiveRow,
} from '../../../hooks/useAdminAdmissionsData';
import {
  ADMISSION_PIPELINE_STAGES,
  CALL_TYPES,
  VISITOR_PURPOSE_OPTIONS,
  VISITOR_FILTER_STATUSES,
  VISITOR_FORM_STATUSES,
  VISITOR_ID_TYPES,
  MEETING_WITH_PRESETS,
  INCIDENT_TYPES,
  SEVERITIES,
  INCIDENT_STATUSES,
  CONTACT_TYPES,
  WORKSPACE_QUICK_MOVES,
  WORKSPACE_TABS,
  enumLabel,
  admissionStatusAccent,
  pipelineStageLabel,
  severityAccent,
  type WorkspaceTab,
} from '../../../utils/admissionsMeta';
import { formatApaarId } from '../../../utils/apaarId';
import { toLocalDateStr } from '../../../utils/apiHelpers';

const ADMISSIONS_TABS: Array<{ key: AdminAdmissionsTab; title: string; subtitle: string }> = [
  {
    key: 'enquiries',
    title: 'Admission Enquiry',
    subtitle: 'CRM pipeline from new application to enrolled.',
  },
  {
    key: 'visitor-register',
    title: 'Visitor Register',
    subtitle: 'Reception register with check-in, check-out, and notes.',
  },
  {
    key: 'front-office',
    title: 'Front Office Desk',
    subtitle: 'Phone call logs and postal dispatch/receive.',
  },
  {
    key: 'incidents',
    title: 'Incidents',
    subtitle: 'Report, track, and resolve campus incidents.',
  },
  {
    key: 'emergency',
    title: 'Emergency Contacts',
    subtitle: 'Emergency directory and escalation points.',
  },
];

type FrontOfficeSegment = 'phone' | 'dispatch' | 'receive';

const BOARD_COL_GAP = 12;
const BOARD_COL_WIDTH = Math.min(300, Math.round(Dimensions.get('window').width * 0.82));
const BOARD_SNAP = BOARD_COL_WIDTH + BOARD_COL_GAP;

function nowTime(): string {
  return new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function visitorStatusAccent(
  s: string,
  isActive: boolean,
): 'green' | 'orange' | 'red' | 'blue' | 'purple' | 'teal' {
  if (!isActive) return 'red';
  const v = s.toLowerCase();
  if (v === 'checked_in') return 'green';
  if (v === 'checked_out' || v === 'pre_registered') return 'teal';
  if (v === 'denied' || v === 'cancelled') return 'red';
  return 'purple';
}

function incidentStatusAccent(s: string): 'green' | 'orange' | 'red' | 'blue' | 'purple' | 'teal' {
  const v = s.toLowerCase();
  if (v === 'resolved' || v === 'closed') return 'green';
  if (v === 'investigating' || v === 'action_taken') return 'orange';
  if (v === 'escalated') return 'red';
  return 'blue';
}

function purposeLabel(value: string): string {
  return VISITOR_PURPOSE_OPTIONS.find((p) => p.value === value)?.label ?? enumLabel(value);
}

function MetaLine({ label, value }: { label: string; value: string }) {
  const theme = useTeacherTheme();
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text
        style={[styles.detailValue, { color: theme.colors.textPrimary }]}
        numberOfLines={4}
      >
        {value || '—'}
      </Text>
    </View>
  );
}

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
  const bg = outline ? theme.colors.surface : danger ? theme.colors.danger : theme.colors.primary;
  const fg = outline ? border : theme.colors.textInverse;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[
        styles.compactBtn,
        { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.5 : 1 },
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
  if (total <= 0) return null;
  return (
    <View style={styles.pageRow}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, flex: 1 }}>
        Page {page} / {pages} · {total} total
      </Text>
      <CompactBtn label="Prev" outline onPress={onPrev} disabled={page <= 1} />
      <CompactBtn label="Next" outline onPress={onNext} disabled={page >= pages} />
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
      <Text style={{ color: theme.colors.textPrimary, fontWeight: '600', fontSize: 14 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function emptyWalkInForm() {
  return {
    applicantName: '',
    parentName: '',
    parentPhone: '',
  };
}

function emptyEnquiryForm() {
  const today = toLocalDateStr();
  return {
    applicantName: '',
    applyingForClass: '',
    assignedTo: '',
    assignedName: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    apaarId: '',
    dateOfBirth: '',
    gender: '',
    applicationDate: today,
    nextFollowUpDate: today,
    source: 'Walk-in',
    reference: 'Self',
    status: 'enquiry',
    address: '',
    previousSchool: '',
    numberOfChild: '',
    remarks: '',
  };
}

function emptyVisitorForm() {
  return {
    visitorName: '',
    phone: '',
    purpose: 'meeting',
    visitingWhom: '',
    idType: 'other',
    idNumber: '',
    visitDate: toLocalDateStr(),
    numberOfPerson: 1,
    inTime: nowTime(),
    outTime: '',
    photoUrl: '',
    attachmentName: '',
    status: 'checked_in',
    note: '',
  };
}

export default function AdminAdmissionsScreen() {
  const theme = useTeacherTheme();
  const insets = useSafeAreaInsets();
  const adm = useAdminAdmissionsData();
  const [tab, setTab] = useState<AdminAdmissionsTab>('enquiries');
  const [frontOfficeSegment, setFrontOfficeSegment] = useState<FrontOfficeSegment>('phone');
  const [enquiryView, setEnquiryView] = useState<'stages' | 'board'>('stages');
  const [boardColIndex, setBoardColIndex] = useState(0);
  const boardScrollRef = useRef<ScrollView>(null);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('overview');
  const [logNote, setLogNote] = useState('');
  const [showLogInteraction, setShowLogInteraction] = useState(false);

  const [walkInModal, setWalkInModal] = useState(false);
  const [walkInForm, setWalkInForm] = useState(emptyWalkInForm);

  const [workspaceModal, setWorkspaceModal] = useState(false);
  const [editingEnquiry, setEditingEnquiry] = useState<EnquiryRow | null>(null);
  const [enquiryForm, setEnquiryForm] = useState(emptyEnquiryForm);

  const [visitorModal, setVisitorModal] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<VisitorRow | null>(null);
  const [visitorForm, setVisitorForm] = useState(emptyVisitorForm);

  const [phoneModal, setPhoneModal] = useState(false);
  const [editingPhone, setEditingPhone] = useState<PhoneCallRow | null>(null);
  const [phoneForm, setPhoneForm] = useState({
    name: '',
    phone: '',
    date: toLocalDateStr(),
    description: '',
    nextFollowUpDate: '',
    callDuration: '',
    note: '',
    callType: 'incoming',
  });

  const [dispatchModal, setDispatchModal] = useState(false);
  const [editingDispatch, setEditingDispatch] = useState<PostalDispatchRow | null>(null);
  const [dispatchForm, setDispatchForm] = useState({
    toTitle: '',
    referenceNo: '',
    address: '',
    note: '',
    fromTitle: '',
    date: toLocalDateStr(),
    attachmentName: '',
  });

  const [receiveModal, setReceiveModal] = useState(false);
  const [editingReceive, setEditingReceive] = useState<PostalReceiveRow | null>(null);
  const [receiveForm, setReceiveForm] = useState({
    fromTitle: '',
    referenceNo: '',
    address: '',
    note: '',
    toTitle: '',
    date: toLocalDateStr(),
    attachmentName: '',
  });

  const [incidentModal, setIncidentModal] = useState(false);
  const [editingIncident, setEditingIncident] = useState<IncidentRow | null>(null);
  const [incidentForm, setIncidentForm] = useState({
    title: '',
    incidentType: 'general',
    severity: 'medium',
    description: '',
    location: '',
    incidentDate: toLocalDateStr(),
    reportedBy: '',
    witnesses: '',
    involvedPersons: '',
    actionTaken: '',
    status: 'reported',
  });

  const [contactModal, setContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContactRow | null>(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    role: '',
    phone: '',
    alternatePhone: '',
    email: '',
    contactType: 'internal',
    isPrimary: false,
  });

  const classOpts = useMemo(
    () => [
      { label: 'All classes', value: '' },
      ...adm.classes.map((c) => ({ label: c.name, value: String(c.id) })),
    ],
    [adm.classes],
  );

  const staffOpts = useMemo(
    () => [
      { label: 'Select staff…', value: '' },
      ...adm.staff.map((s) => ({ label: s.label, value: String(s.userId) })),
    ],
    [adm.staff],
  );

  const meetingWithOpts = useMemo(
    () => [
      ...MEETING_WITH_PRESETS.map((p) => ({ label: p, value: p })),
      ...adm.staff.map((s) => ({ label: s.label, value: s.label })),
    ],
    [adm.staff],
  );

  const frontOfficeChips: ChipOption[] = useMemo(
    () => [
      { key: 'phone', label: 'Phone Calls' },
      { key: 'dispatch', label: 'Dispatch' },
      { key: 'receive', label: 'Receive' },
    ],
    [],
  );

  const enquiryKpiItems = useMemo(
    () => [
      {
        key: 'new',
        label: 'New',
        value: String(adm.pipelineKpis?.newCount ?? 0),
        icon: 'sparkles-outline' as const,
        accent: 'blue' as const,
      },
      {
        key: 'due',
        label: 'Due Today',
        value: String(adm.pipelineKpis?.dueToday ?? 0),
        icon: 'alarm-outline' as const,
        accent: 'orange' as const,
      },
      {
        key: 'enrolled',
        label: 'Enrolled',
        value: String(adm.pipelineKpis?.enrolled ?? 0),
        icon: 'school-outline' as const,
        accent: 'teal' as const,
      },
    ],
    [adm.pipelineKpis],
  );

  const visitorKpiItems = useMemo(
    () => [
      {
        key: 'total',
        label: 'Total',
        value: String(adm.visitorStats.total),
        icon: 'people-outline' as const,
        accent: 'blue' as const,
      },
      {
        key: 'in',
        label: 'Checked In',
        value: String(adm.visitorStats.checkedIn),
        icon: 'log-in-outline' as const,
        accent: 'green' as const,
      },
      {
        key: 'out',
        label: 'Checked Out',
        value: String(adm.visitorStats.checkedOut),
        icon: 'log-out-outline' as const,
        accent: 'teal' as const,
      },
      {
        key: 'today',
        label: 'Today',
        value: String(adm.visitorStats.today),
        icon: 'today-outline' as const,
        accent: 'orange' as const,
      },
    ],
    [adm.visitorStats],
  );

  const confirmDeactivate = (label: string, onOk: () => void) => {
    Alert.alert('Deactivate?', `Deactivate this ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: onOk },
    ]);
  };

  const scrollBoardTo = (index: number) => {
    const i = Math.max(0, Math.min(ADMISSION_PIPELINE_STAGES.length - 1, index));
    setBoardColIndex(i);
    boardScrollRef.current?.scrollTo({ x: i * BOARD_SNAP, animated: true });
  };

  const onBoardScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / BOARD_SNAP);
    setBoardColIndex(Math.max(0, Math.min(ADMISSION_PIPELINE_STAGES.length - 1, i)));
  };

  const openEnquiryCreate = () => {
    setWalkInForm(emptyWalkInForm());
    setWalkInModal(true);
  };

  const openEnquiryEdit = (item: EnquiryRow) => {
    setEditingEnquiry(item);
    const stage = ADMISSION_PIPELINE_STAGES.find((s) =>
      (s.match as readonly string[]).includes((item.status || '').toLowerCase()),
    );
    setEnquiryForm({
      applicantName: item.applicantName,
      applyingForClass: item.applyingForClass != null ? String(item.applyingForClass) : '',
      assignedTo: item.assignedTo != null ? String(item.assignedTo) : '',
      assignedName: item.assignedName,
      parentName: item.parentName,
      parentPhone: item.parentPhone,
      parentEmail: item.parentEmail,
      apaarId: item.apaarId,
      dateOfBirth: item.dateOfBirth,
      gender: item.gender,
      applicationDate: item.applicationDate || toLocalDateStr(),
      nextFollowUpDate: item.nextFollowUpDate,
      source: item.source || 'Walk-in',
      reference: item.reference || 'Self',
      status: stage?.writeStatus || item.status || 'enquiry',
      address: item.address,
      previousSchool: item.previousSchool,
      numberOfChild: item.numberOfChild != null ? String(item.numberOfChild) : '',
      remarks: item.remarks,
    });
    setWorkspaceTab('overview');
    setShowLogInteraction(false);
    setLogNote('');
    setWorkspaceModal(true);
  };

  const closeWorkspace = () => {
    setWorkspaceModal(false);
    setEditingEnquiry(null);
    setShowLogInteraction(false);
    setLogNote('');
  };

  const callParent = (phone: string) => {
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (!cleaned) {
      Alert.alert('No phone', 'Parent phone is not set for this application.');
      return;
    }
    void Linking.openURL(`tel:${cleaned}`);
  };

  const submitWalkIn = async () => {
    const form = {
      ...emptyEnquiryForm(),
      applicantName: walkInForm.applicantName,
      parentName: walkInForm.parentName,
      parentPhone: walkInForm.parentPhone,
      source: 'Walk-in',
      status: 'enquiry',
      nextFollowUpDate: '',
    };
    const ok = await adm.saveEnquiry(form);
    if (ok) setWalkInModal(false);
    else Alert.alert('Save failed', adm.error || 'Could not create application');
  };

  const submitQuickEdit = async () => {
    if (!editingEnquiry) return;
    const ok = await adm.saveEnquiry(
      {
        ...enquiryForm,
        // Quick Edit: only phone/email corrections (keep other fields as loaded)
      },
      editingEnquiry.id,
    );
    if (ok) {
      Alert.alert('Saved', 'Contact details updated.');
      // Refresh local header from form
      setEditingEnquiry((prev) =>
        prev
          ? {
              ...prev,
              parentPhone: enquiryForm.parentPhone,
              parentEmail: enquiryForm.parentEmail,
              parentName: enquiryForm.parentName,
            }
          : prev,
      );
    } else {
      Alert.alert('Save failed', adm.error || 'Could not save');
    }
  };

  const submitLogInteraction = async () => {
    if (!editingEnquiry) return;
    if (!logNote.trim()) {
      Alert.alert('Note required', 'Enter a short note for this interaction.');
      return;
    }
    const stamp = `${toLocalDateStr()} ${new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
    const line = `[${stamp}] ${logNote.trim()}`;
    const nextRemarks = enquiryForm.remarks
      ? `${enquiryForm.remarks}\n${line}`
      : line;
    const phoneOk = await adm.savePhoneCall({
      name: enquiryForm.parentName || enquiryForm.applicantName,
      phone: enquiryForm.parentPhone,
      date: toLocalDateStr(),
      description: logNote.trim(),
      nextFollowUpDate: enquiryForm.nextFollowUpDate || '',
      callDuration: '',
      note: `Admission #${editingEnquiry.id}`,
      callType: 'outgoing',
    });
    const enquiryOk = await adm.saveEnquiry(
      { ...enquiryForm, remarks: nextRemarks },
      editingEnquiry.id,
    );
    if (phoneOk || enquiryOk) {
      setEnquiryForm((f) => ({ ...f, remarks: nextRemarks }));
      setLogNote('');
      setShowLogInteraction(false);
      setWorkspaceTab('timeline');
      Alert.alert('Logged', 'Interaction saved to timeline.');
    } else {
      Alert.alert('Failed', adm.error || 'Could not log interaction');
    }
  };

  const openVisitorCreate = () => {
    setEditingVisitor(null);
    setVisitorForm(emptyVisitorForm());
    setVisitorModal(true);
  };

  const openVisitorEdit = (item: VisitorRow) => {
    setEditingVisitor(item);
    setVisitorForm({
      visitorName: item.visitorName,
      phone: item.phone,
      purpose: item.purpose || 'meeting',
      visitingWhom: item.visitingWhom,
      idType: item.idType || 'other',
      idNumber: item.idNumber,
      visitDate: item.visitDate || toLocalDateStr(),
      numberOfPerson: item.numberOfPerson || 1,
      inTime: item.inTime || nowTime(),
      outTime: item.outTime,
      photoUrl: item.photoUrl,
      attachmentName: item.attachmentName,
      status: item.status || 'checked_in',
      note: item.note,
    });
    setVisitorModal(true);
  };

  const openPhoneCreate = () => {
    setEditingPhone(null);
    setPhoneForm({
      name: '',
      phone: '',
      date: toLocalDateStr(),
      description: '',
      nextFollowUpDate: '',
      callDuration: '',
      note: '',
      callType: 'incoming',
    });
    setPhoneModal(true);
  };

  const openPhoneEdit = (item: PhoneCallRow) => {
    setEditingPhone(item);
    setPhoneForm({
      name: item.name,
      phone: item.phone,
      date: item.date || toLocalDateStr(),
      description: item.description,
      nextFollowUpDate: item.nextFollowUpDate,
      callDuration: item.callDuration,
      note: item.note,
      callType: item.callType || 'incoming',
    });
    setPhoneModal(true);
  };

  const openDispatchCreate = () => {
    setEditingDispatch(null);
    setDispatchForm({
      toTitle: '',
      referenceNo: '',
      address: '',
      note: '',
      fromTitle: '',
      date: toLocalDateStr(),
      attachmentName: '',
    });
    setDispatchModal(true);
  };

  const openDispatchEdit = (item: PostalDispatchRow) => {
    setEditingDispatch(item);
    setDispatchForm({
      toTitle: item.toTitle,
      referenceNo: item.referenceNo,
      address: item.address,
      note: item.note,
      fromTitle: item.fromTitle,
      date: item.date || toLocalDateStr(),
      attachmentName: item.attachmentName,
    });
    setDispatchModal(true);
  };

  const openReceiveCreate = () => {
    setEditingReceive(null);
    setReceiveForm({
      fromTitle: '',
      referenceNo: '',
      address: '',
      note: '',
      toTitle: '',
      date: toLocalDateStr(),
      attachmentName: '',
    });
    setReceiveModal(true);
  };

  const openReceiveEdit = (item: PostalReceiveRow) => {
    setEditingReceive(item);
    setReceiveForm({
      fromTitle: item.fromTitle,
      referenceNo: item.referenceNo,
      address: item.address,
      note: item.note,
      toTitle: item.toTitle,
      date: item.date || toLocalDateStr(),
      attachmentName: item.attachmentName,
    });
    setReceiveModal(true);
  };

  const openIncidentCreate = () => {
    setEditingIncident(null);
    setIncidentForm({
      title: '',
      incidentType: 'general',
      severity: 'medium',
      description: '',
      location: '',
      incidentDate: adm.today(),
      reportedBy: '',
      witnesses: '',
      involvedPersons: '',
      actionTaken: '',
      status: 'reported',
    });
    setIncidentModal(true);
  };

  const openIncidentEdit = (item: IncidentRow) => {
    setEditingIncident(item);
    setIncidentForm({
      title: item.title,
      incidentType: item.incidentType || 'general',
      severity: item.severity || 'medium',
      description: item.description,
      location: item.location,
      incidentDate: item.incidentDate || adm.today(),
      reportedBy: item.reportedBy != null ? String(item.reportedBy) : '',
      witnesses: item.witnesses,
      involvedPersons: item.involvedPersons,
      actionTaken: item.actionTaken,
      status: item.status || 'reported',
    });
    setIncidentModal(true);
  };

  const openContactCreate = () => {
    setEditingContact(null);
    setContactForm({
      name: '',
      role: '',
      phone: '',
      alternatePhone: '',
      email: '',
      contactType: 'internal',
      isPrimary: false,
    });
    setContactModal(true);
  };

  const openContactEdit = (item: EmergencyContactRow) => {
    setEditingContact(item);
    setContactForm({
      name: item.name,
      role: item.role,
      phone: item.phone,
      alternatePhone: item.alternatePhone,
      email: item.email,
      contactType: item.contactType || 'internal',
      isPrimary: item.isPrimary,
    });
    setContactModal(true);
  };

  const moveStatusOpts = (current: string) => {
    const currentKey = ADMISSION_PIPELINE_STAGES.find((s) =>
      (s.match as readonly string[]).includes(current.toLowerCase()),
    )?.key;
    return ADMISSION_PIPELINE_STAGES.filter((s) => s.key !== currentKey).map((s) => ({
      label: s.label,
      value: s.key,
    }));
  };

  return (
    <TeacherScreen
      header={
        <ScreenHeader
          title="Admissions Operations Desk"
          trailingIcon="refresh-outline"
          onTrailingPress={() => void adm.refetch()}
        />
      }
      contentStyle={styles.content}
    >
      <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>Admission Desk</Text>
      <Text style={[styles.heroTitle, { color: theme.colors.textPrimary }]}>
        Admissions Operations Desk
      </Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginBottom: 4 }}>
        Manage enquiries, visitors, incidents, and emergency contacts from one workspace.
      </Text>

      {adm.status === 'loading' && adm.filteredEnquiries.length === 0 ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 12 }} />
      ) : null}
      {adm.error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{adm.error}</Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRail}
      >
        {ADMISSIONS_TABS.map((t) => {
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

      {/* Enquiries — Admission Pipeline CRM */}
      {tab === 'enquiries' ? (
        <View style={styles.section}>
          <Text style={[styles.pipelineTitle, { color: theme.colors.textPrimary }]}>
            Admission Pipeline
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 4 }}>
            CRM stages from new application to enrolled.
          </Text>

          <StatGrid items={enquiryKpiItems} columns={3} variant="tinted" />

          <SurfaceCard>
            <Text style={[styles.pipelineRailTitle, { color: theme.colors.textPrimary }]}>
              Pipeline stages
            </Text>
            {ADMISSION_PIPELINE_STAGES.map((stage, index) => {
              const active = adm.statusFilter === stage.key;
              const count = adm.pipelineStageCounts?.[stage.key] ?? 0;
              return (
                <TouchableOpacity
                  key={stage.key}
                  onPress={() => {
                    setEnquiryView('stages');
                    adm.setStatusFilter(stage.key);
                  }}
                  activeOpacity={0.85}
                  style={[
                    styles.pipelineStageRow,
                    {
                      backgroundColor: active
                        ? theme.colors.primary + '18'
                        : 'transparent',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.pipelineNum,
                      {
                        backgroundColor: active
                          ? theme.colors.primary
                          : theme.colors.background,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color: active ? theme.colors.textInverse : theme.colors.textSecondary,
                      }}
                    >
                      {index + 1}
                    </Text>
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      fontWeight: active ? '800' : '600',
                      color: active ? theme.colors.textPrimary : theme.colors.textSecondary,
                    }}
                  >
                    {stage.label}
                  </Text>
                  <View
                    style={[
                      styles.stageCount,
                      { backgroundColor: theme.colors.background },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color: theme.colors.textSecondary,
                      }}
                    >
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </SurfaceCard>

          <View
            style={[
              styles.stepBar,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
              Step {adm.activePipelineStep ?? 1} of {ADMISSION_PIPELINE_STAGES.length} —{' '}
              {adm.activePipelineStage?.label ?? 'New'}
            </Text>
            <View style={styles.stepSegments}>
              {ADMISSION_PIPELINE_STAGES.map((stage, i) => (
                <View
                  key={stage.key}
                  style={[
                    styles.stepSeg,
                    {
                      backgroundColor:
                        i < (adm.activePipelineStep ?? 1)
                          ? theme.colors.primary
                          : theme.colors.border,
                    },
                  ]}
                />
              ))}
            </View>
          </View>

          <SearchBar
            value={adm.searchName}
            onChangeText={adm.setSearchName}
            placeholder="Search name, phone, ADM-…"
          />

          <View style={styles.viewToggleRow}>
            <TouchableOpacity
              onPress={() => setEnquiryView('stages')}
              activeOpacity={0.85}
              style={[
                styles.viewToggleBtn,
                {
                  backgroundColor:
                    enquiryView === 'stages' ? theme.colors.primary : theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color:
                    enquiryView === 'stages'
                      ? theme.colors.textInverse
                      : theme.colors.textPrimary,
                }}
              >
                Stages
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setEnquiryView('board');
                setBoardColIndex(0);
                requestAnimationFrame(() => scrollBoardTo(0));
              }}
              activeOpacity={0.85}
              style={[
                styles.viewToggleBtn,
                {
                  backgroundColor:
                    enquiryView === 'board' ? theme.colors.primary : theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color:
                    enquiryView === 'board'
                      ? theme.colors.textInverse
                      : theme.colors.textPrimary,
                }}
              >
                Board
              </Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <CompactBtn label="+ New application" icon="add" onPress={openEnquiryCreate} />
          </View>

          {enquiryView === 'stages' ? (
            <>
              <Text style={[styles.stageHeading, { color: theme.colors.textPrimary }]}>
                {adm.activePipelineStage?.label ?? 'New'}
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                Applications in this stage. Open a workspace to log interactions or move to the
                next step.
              </Text>

              <FormField label="Class">
                <SelectField
                  options={classOpts}
                  value={adm.searchClass}
                  onChange={adm.setSearchClass}
                  placeholder="All classes"
                />
              </FormField>

              {adm.filteredEnquiries.length === 0 ? (
                <EmptyState
                  icon="document-text-outline"
                  title={`No applications in ${adm.activePipelineStage?.label ?? 'this stage'}`}
                  message="Create a new application or move an enquiry into this stage."
                />
              ) : (
                adm.filteredEnquiries.map((item) => (
                  <SurfaceCard key={item.id}>
                    <View style={styles.listRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                          {item.applicantName}
                        </Text>
                        <View style={styles.row}>
                          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                            {item.className || '—'}
                          </Text>
                          <Badge
                            label={pipelineStageLabel(item.status)}
                            accent={admissionStatusAccent(item.status)}
                          />
                          {!item.isActive ? <Badge label="deactivated" accent="red" /> : null}
                        </View>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                          {item.parentName || '—'} · {item.parentPhone || '—'}
                        </Text>
                      </View>
                    </View>
                    {item.isActive ? (
                      <View style={styles.cardActions}>
                        <View style={{ flex: 1, minWidth: 140 }}>
                          <SelectField
                            options={moveStatusOpts(item.status)}
                            value={null}
                            onChange={(v) => {
                              void adm.moveEnquiryStatus(item.id, v);
                            }}
                            placeholder="Move to…"
                          />
                        </View>
                        <CompactBtn
                          label="Open workspace"
                          outline
                          onPress={() => openEnquiryEdit(item)}
                        />
                      </View>
                    ) : null}
                  </SurfaceCard>
                ))
              )}

              <PageRow
                page={adm.enquiryPage}
                pages={adm.enquiryPages}
                total={adm.enquiryTotal}
                onPrev={() => adm.setEnquiryPage(Math.max(1, adm.enquiryPage - 1))}
                onNext={() =>
                  adm.setEnquiryPage(Math.min(adm.enquiryPages, adm.enquiryPage + 1))
                }
              />
            </>
          ) : (
            <View style={styles.boardWrap}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 4 }}>
                Swipe columns · {boardColIndex + 1} of {ADMISSION_PIPELINE_STAGES.length} —{' '}
                {ADMISSION_PIPELINE_STAGES[boardColIndex]?.label}
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.boardJumpRail}
              >
                {ADMISSION_PIPELINE_STAGES.map((stage, index) => {
                  const active = boardColIndex === index;
                  const count = adm.pipelineStageCounts?.[stage.key] ?? 0;
                  return (
                    <TouchableOpacity
                      key={stage.key}
                      onPress={() => scrollBoardTo(index)}
                      activeOpacity={0.85}
                      style={[
                        styles.boardJumpChip,
                        {
                          backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                          borderColor: active ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: active ? theme.colors.textInverse : theme.colors.textPrimary,
                        }}
                      >
                        {index + 1}. {stage.label}
                      </Text>
                      <View
                        style={[
                          styles.boardJumpCount,
                          {
                            backgroundColor: active
                              ? 'rgba(255,255,255,0.22)'
                              : theme.colors.background,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '800',
                            color: active ? theme.colors.textInverse : theme.colors.textSecondary,
                          }}
                        >
                          {count}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <ScrollView
                ref={boardScrollRef}
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator
                decelerationRate="fast"
                snapToInterval={BOARD_SNAP}
                snapToAlignment="start"
                disableIntervalMomentum
                onMomentumScrollEnd={onBoardScrollEnd}
                onScrollEndDrag={onBoardScrollEnd}
                contentContainerStyle={styles.boardRow}
              >
                {ADMISSION_PIPELINE_STAGES.map((stage, index) => {
                  const cards = (adm.boardEnquiries || []).filter((row) =>
                    (stage.match as readonly string[]).includes(row.status.toLowerCase()),
                  );
                  const count = adm.pipelineStageCounts?.[stage.key] ?? cards.length;
                  const activeCol = boardColIndex === index;
                  return (
                    <View
                      key={stage.key}
                      style={[
                        styles.boardCol,
                        {
                          width: BOARD_COL_WIDTH,
                          marginRight: index === ADMISSION_PIPELINE_STAGES.length - 1 ? 0 : BOARD_COL_GAP,
                          backgroundColor: theme.colors.surface,
                          borderColor: activeCol ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                    >
                      <View style={styles.boardColHeader}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text
                            style={[styles.boardColTitle, { color: theme.colors.textPrimary }]}
                            numberOfLines={2}
                          >
                            {stage.label}
                          </Text>
                          <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                            Step {index + 1} of {ADMISSION_PIPELINE_STAGES.length}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.boardCountBadge,
                            { backgroundColor: theme.colors.background },
                          ]}
                        >
                          <Text
                            style={{
                              fontWeight: '800',
                              fontSize: 13,
                              color: theme.colors.textPrimary,
                            }}
                          >
                            {count}
                          </Text>
                        </View>
                      </View>

                      <ScrollView
                        nestedScrollEnabled
                        style={styles.boardColScroll}
                        contentContainerStyle={styles.boardColScrollContent}
                        showsVerticalScrollIndicator={false}
                      >
                        {cards.length === 0 ? (
                          <View style={styles.boardEmpty}>
                            <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                              No applications
                            </Text>
                          </View>
                        ) : (
                          cards.map((item) => (
                            <TouchableOpacity
                              key={item.id}
                              activeOpacity={0.85}
                              onPress={() => openEnquiryEdit(item)}
                              style={[
                                styles.boardCard,
                                {
                                  borderColor: theme.colors.border,
                                  backgroundColor: theme.colors.background,
                                },
                              ]}
                            >
                              <Text
                                style={{
                                  fontWeight: '800',
                                  color: theme.colors.textPrimary,
                                  fontSize: 15,
                                }}
                                numberOfLines={2}
                              >
                                {item.applicantName}
                              </Text>
                              <Text
                                style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }}
                                numberOfLines={1}
                              >
                                {item.className || '—'}
                              </Text>
                              <Text
                                style={{
                                  color: theme.colors.textSecondary,
                                  fontSize: 11,
                                  marginTop: 8,
                                  textTransform: 'lowercase',
                                }}
                              >
                                — {pipelineStageLabel(item.status)}
                              </Text>
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      ) : null}

      {/* Visitor Register */}
      {tab === 'visitor-register' ? (
        <View style={styles.section}>
          <StatGrid items={visitorKpiItems} columns={2} variant="tinted" />

          <SearchBar
            value={adm.visitorSearch}
            onChangeText={adm.setVisitorSearch}
            placeholder="Search visitors…"
          />

          <FormField label="Purpose">
            <SelectField
              options={[
                { label: 'All purposes', value: '' },
                ...VISITOR_PURPOSE_OPTIONS.map((p) => ({ label: p.label, value: p.value })),
              ]}
              value={adm.purposeFilter}
              onChange={adm.setPurpose}
              placeholder="All purposes"
            />
          </FormField>
          <FormField label="Status">
            <SelectField
              options={VISITOR_FILTER_STATUSES.map((s) => ({
                label: s === 'all' ? 'All statuses' : enumLabel(s),
                value: s === 'all' ? '' : s,
              }))}
              value={adm.visitorStatusFilter}
              onChange={adm.setVisitorStatus}
              placeholder="All statuses"
            />
          </FormField>

          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {adm.filteredVisitors.length} visitor{adm.filteredVisitors.length === 1 ? '' : 's'}
            </Text>
            <CompactBtn label="Refresh" outline icon="refresh" onPress={() => void adm.loadVisitors()} />
            <CompactBtn label="Add Visitor" icon="add" onPress={openVisitorCreate} />
          </View>

          {adm.filteredVisitors.length === 0 ? (
            <EmptyState
              icon="person-add-outline"
              title="No visitors"
              message="Register visitors at the front desk."
            />
          ) : (
            adm.filteredVisitors.map((item) => (
              <SurfaceCard key={item.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.row}>
                      <Badge label={purposeLabel(item.purpose)} accent="purple" />
                      <Badge
                        label={item.isActive ? enumLabel(item.status) : 'deactivated'}
                        accent={visitorStatusAccent(item.status, item.isActive)}
                      />
                    </View>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary, marginTop: 6 }]}>
                      {item.visitorName}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      Meeting with: {item.visitingWhom || '—'}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      {item.phone || '—'} · ID: {item.idNumber || '—'} · Persons: {item.numberOfPerson}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      {item.visitDate || '—'} · In: {item.inTime || '—'} · Out: {item.outTime || '—'}
                    </Text>
                  </View>
                </View>
                {item.isActive ? (
                  <View style={styles.cardActions}>
                    <CompactBtn label="Edit" outline onPress={() => openVisitorEdit(item)} />
                    {item.status !== 'checked_out' && !item.checkOut ? (
                      <CompactBtn
                        label="Check-out"
                        outline
                        icon="log-out-outline"
                        onPress={() => void adm.checkOutVisitor(item.id)}
                      />
                    ) : null}
                    <CompactBtn
                      label="Deactivate"
                      outline
                      danger
                      onPress={() =>
                        confirmDeactivate('visitor', () => {
                          void adm.removeVisitor(item.id);
                        })
                      }
                    />
                  </View>
                ) : null}
              </SurfaceCard>
            ))
          )}

          <PageRow
            page={adm.visitorPage}
            pages={adm.visitorPages}
            total={adm.visitorTotal}
            onPrev={() => adm.setVisitorPage(Math.max(1, adm.visitorPage - 1))}
            onNext={() =>
              adm.setVisitorPage(Math.min(adm.visitorPages, adm.visitorPage + 1))
            }
          />
        </View>
      ) : null}

      {/* Front Office */}
      {tab === 'front-office' ? (
        <View style={styles.section}>
          <FilterChips
            size="sm"
            options={frontOfficeChips}
            activeKey={frontOfficeSegment}
            onChange={(key) => setFrontOfficeSegment(key as FrontOfficeSegment)}
          />

          <SearchBar
            value={adm.frontOfficeQuery}
            onChangeText={adm.setFrontOfficeQuery}
            placeholder="Search front office records…"
          />
          <CompactBtn
            label="Reset"
            outline
            onPress={() => adm.setFrontOfficeQuery('')}
          />

          {frontOfficeSegment === 'phone' ? (
            <>
              <View style={styles.row}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
                  {adm.phoneCalls.length} call{adm.phoneCalls.length === 1 ? '' : 's'}
                </Text>
                <CompactBtn label="Refresh" outline icon="refresh" onPress={() => void adm.loadFrontOffice()} />
                <CompactBtn label="Add Call" icon="add" onPress={openPhoneCreate} />
              </View>
              {adm.phoneCalls.length === 0 ? (
                <EmptyState
                  icon="call-outline"
                  title="No phone calls"
                  message="Log incoming and outgoing phone calls."
                />
              ) : (
                adm.phoneCalls.map((item) => (
                  <SurfaceCard key={item.id}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {item.name || item.phone}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      {item.phone} · {item.date || '—'} · {enumLabel(item.callType)}
                    </Text>
                    {item.description ? (
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                        {item.description}
                      </Text>
                    ) : null}
                    {item.isActive ? (
                      <View style={styles.cardActions}>
                        <CompactBtn label="Edit" outline onPress={() => openPhoneEdit(item)} />
                        <CompactBtn
                          label="Deactivate"
                          outline
                          danger
                          onPress={() =>
                            confirmDeactivate('phone call', () => {
                              void adm.removePhoneCall(item.id);
                            })
                          }
                        />
                      </View>
                    ) : (
                      <Badge label="deactivated" accent="red" />
                    )}
                  </SurfaceCard>
                ))
              )}
            </>
          ) : null}

          {frontOfficeSegment === 'dispatch' ? (
            <>
              <View style={styles.row}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
                  {adm.postalDispatch.length} dispatch record
                  {adm.postalDispatch.length === 1 ? '' : 's'}
                </Text>
                <CompactBtn label="Refresh" outline icon="refresh" onPress={() => void adm.loadFrontOffice()} />
                <CompactBtn label="Add Dispatch" icon="add" onPress={openDispatchCreate} />
              </View>
              {adm.postalDispatch.length === 0 ? (
                <EmptyState
                  icon="send-outline"
                  title="No dispatch records"
                  message="Log outgoing postal dispatch entries."
                />
              ) : (
                adm.postalDispatch.map((item) => (
                  <SurfaceCard key={item.id}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      To: {item.toTitle}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      Ref: {item.referenceNo || '—'} · {item.date || '—'}
                    </Text>
                    {item.fromTitle ? (
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                        From: {item.fromTitle}
                      </Text>
                    ) : null}
                    {item.isActive ? (
                      <View style={styles.cardActions}>
                        <CompactBtn label="Edit" outline onPress={() => openDispatchEdit(item)} />
                        <CompactBtn
                          label="Deactivate"
                          outline
                          danger
                          onPress={() =>
                            confirmDeactivate('dispatch record', () => {
                              void adm.removePostalDispatch(item.id);
                            })
                          }
                        />
                      </View>
                    ) : (
                      <Badge label="deactivated" accent="red" />
                    )}
                  </SurfaceCard>
                ))
              )}
            </>
          ) : null}

          {frontOfficeSegment === 'receive' ? (
            <>
              <View style={styles.row}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
                  {adm.postalReceive.length} receive record
                  {adm.postalReceive.length === 1 ? '' : 's'}
                </Text>
                <CompactBtn label="Refresh" outline icon="refresh" onPress={() => void adm.loadFrontOffice()} />
                <CompactBtn label="Add Receive" icon="add" onPress={openReceiveCreate} />
              </View>
              {adm.postalReceive.length === 0 ? (
                <EmptyState
                  icon="mail-open-outline"
                  title="No receive records"
                  message="Log incoming postal receive entries."
                />
              ) : (
                adm.postalReceive.map((item) => (
                  <SurfaceCard key={item.id}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      From: {item.fromTitle}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      Ref: {item.referenceNo || '—'} · {item.date || '—'}
                    </Text>
                    {item.toTitle ? (
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                        To: {item.toTitle}
                      </Text>
                    ) : null}
                    {item.isActive ? (
                      <View style={styles.cardActions}>
                        <CompactBtn label="Edit" outline onPress={() => openReceiveEdit(item)} />
                        <CompactBtn
                          label="Deactivate"
                          outline
                          danger
                          onPress={() =>
                            confirmDeactivate('receive record', () => {
                              void adm.removePostalReceive(item.id);
                            })
                          }
                        />
                      </View>
                    ) : (
                      <Badge label="deactivated" accent="red" />
                    )}
                  </SurfaceCard>
                ))
              )}
            </>
          ) : null}
        </View>
      ) : null}

      {/* Incidents */}
      {tab === 'incidents' ? (
        <View style={styles.section}>
          <FormField label="Incident type">
            <SelectField
              options={[
                { label: 'All types', value: '' },
                ...INCIDENT_TYPES.map((t) => ({ label: enumLabel(t), value: t })),
              ]}
              value={adm.incidentTypeFilter}
              onChange={adm.setIncidentType}
              placeholder="All types"
            />
          </FormField>
          <FormField label="Severity">
            <SelectField
              options={[
                { label: 'All severities', value: '' },
                ...SEVERITIES.map((s) => ({ label: s, value: s })),
              ]}
              value={adm.severityFilter}
              onChange={adm.setSeverity}
              placeholder="All severities"
            />
          </FormField>

          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {adm.incidentTotal} incident{adm.incidentTotal === 1 ? '' : 's'}
            </Text>
            <CompactBtn label="Refresh" outline icon="refresh" onPress={() => void adm.loadIncidents()} />
            <CompactBtn label="Report Incident" icon="add" onPress={openIncidentCreate} />
          </View>

          {adm.incidents.length === 0 ? (
            <EmptyState
              icon="warning-outline"
              title="No incidents"
              message="Report a campus incident to track resolution."
            />
          ) : (
            adm.incidents.map((item) => (
              <SurfaceCard key={item.id}>
                <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                  {item.title}
                </Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                  {item.incidentDate || '—'}
                </Text>
                <View style={styles.row}>
                  <Badge label={enumLabel(item.incidentType)} accent="purple" />
                  <Badge label={item.severity} accent={severityAccent(item.severity)} />
                  <Badge
                    label={enumLabel(item.status)}
                    accent={incidentStatusAccent(item.status)}
                  />
                </View>
                {item.isActive ? (
                  <View style={styles.cardActions}>
                    <CompactBtn label="Edit" outline onPress={() => openIncidentEdit(item)} />
                    <CompactBtn
                      label="Deactivate"
                      outline
                      danger
                      onPress={() =>
                        confirmDeactivate('incident', () => {
                          void adm.removeIncident(item.id);
                        })
                      }
                    />
                  </View>
                ) : (
                  <Badge label="deactivated" accent="red" />
                )}
              </SurfaceCard>
            ))
          )}

          <PageRow
            page={adm.incidentPage}
            pages={adm.incidentPages}
            total={adm.incidentTotal}
            onPrev={() => adm.setIncidentPage(Math.max(1, adm.incidentPage - 1))}
            onNext={() =>
              adm.setIncidentPage(Math.min(adm.incidentPages, adm.incidentPage + 1))
            }
          />
        </View>
      ) : null}

      {/* Emergency Contacts */}
      {tab === 'emergency' ? (
        <View style={styles.section}>
          <FormField label="Contact type">
            <SelectField
              options={[
                { label: 'All contact types', value: '' },
                ...CONTACT_TYPES.map((t) => ({ label: enumLabel(t), value: t })),
              ]}
              value={adm.contactTypeFilter}
              onChange={adm.setContactType}
              placeholder="All contact types"
            />
          </FormField>

          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {adm.contactTotal} contact{adm.contactTotal === 1 ? '' : 's'}
            </Text>
            <CompactBtn label="Refresh" outline icon="refresh" onPress={() => void adm.loadContacts()} />
            <CompactBtn label="Add Contact" icon="add" onPress={openContactCreate} />
          </View>

          {adm.contacts.length === 0 ? (
            <EmptyState
              icon="call-outline"
              title="No emergency contacts"
              message="Add internal or external escalation contacts."
            />
          ) : (
            adm.contacts.map((item) => (
              <SurfaceCard key={item.id}>
                <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                  {item.name}
                </Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                  {item.role || '—'} · {item.phone}
                </Text>
                <View style={styles.row}>
                  <Badge label={enumLabel(item.contactType)} accent="blue" />
                  {item.isPrimary ? <Badge label="Primary" accent="green" /> : null}
                  {!item.isActive ? <Badge label="deactivated" accent="red" /> : null}
                </View>
                {item.isActive ? (
                  <View style={styles.cardActions}>
                    <CompactBtn label="Edit" outline onPress={() => openContactEdit(item)} />
                    <CompactBtn
                      label="Deactivate"
                      outline
                      danger
                      onPress={() =>
                        confirmDeactivate('contact', () => {
                          void adm.removeContact(item.id);
                        })
                      }
                    />
                  </View>
                ) : null}
              </SurfaceCard>
            ))
          )}

          <PageRow
            page={adm.contactPage}
            pages={adm.contactPages}
            total={adm.contactTotal}
            onPrev={() => adm.setContactPage(Math.max(1, adm.contactPage - 1))}
            onNext={() =>
              adm.setContactPage(Math.min(adm.contactPages, adm.contactPage + 1))
            }
          />
        </View>
      ) : null}

      {/* New walk-in application — 3 fields (web parity) */}
      <Modal visible={walkInModal} animationType="fade" transparent onRequestClose={() => setWalkInModal(false)}>
        <View style={styles.walkInOverlay}>
          <View style={[styles.walkInCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary, marginBottom: 12 }]}>
              New walk-in application
            </Text>
            <FormField label="Applicant name" required>
              <TextField
                value={walkInForm.applicantName}
                onChangeText={(v) => setWalkInForm((f) => ({ ...f, applicantName: v }))}
              />
            </FormField>
            <FormField label="Parent name">
              <TextField
                value={walkInForm.parentName}
                onChangeText={(v) => setWalkInForm((f) => ({ ...f, parentName: v }))}
              />
            </FormField>
            <FormField label="Parent phone" required>
              <TextField
                value={walkInForm.parentPhone}
                onChangeText={(v) => setWalkInForm((f) => ({ ...f, parentPhone: v }))}
                keyboardType="phone-pad"
              />
            </FormField>
            <View style={styles.walkInActions}>
              <CompactBtn label="Cancel" outline onPress={() => setWalkInModal(false)} />
              <CompactBtn
                label={adm.busy ? 'Saving…' : 'Create'}
                disabled={adm.busy}
                onPress={() => void submitWalkIn()}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Admission Workspace */}
      <Modal
        visible={workspaceModal}
        animationType="slide"
        onRequestClose={closeWorkspace}
        statusBarTranslucent
        presentationStyle="fullScreen"
      >
        <View style={[styles.workspaceRoot, { backgroundColor: theme.colors.background }]}>
          <View
            style={[
              styles.workspaceHeader,
              {
                backgroundColor: theme.colors.primary,
                paddingTop: Math.max(insets.top, 12) + 10,
              },
            ]}
          >
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.workspaceEyebrow}>Admission Workspace</Text>
              <Text style={styles.workspaceName} numberOfLines={2}>
                {editingEnquiry?.applicantName || enquiryForm.applicantName}
              </Text>
              <View style={styles.workspaceMetaRow}>
                <View style={styles.workspaceChip}>
                  <Text style={styles.workspaceChipText}>ID {editingEnquiry?.id ?? '—'}</Text>
                </View>
                <View style={[styles.workspaceChip, styles.workspaceChipStrong]}>
                  <Text style={styles.workspaceChipText}>
                    {pipelineStageLabel(editingEnquiry?.status || enquiryForm.status)}
                  </Text>
                </View>
                <View style={styles.workspaceChip}>
                  <Text style={styles.workspaceChipText} numberOfLines={1}>
                    {editingEnquiry?.className ||
                      adm.classes.find((c) => String(c.id) === enquiryForm.applyingForClass)
                        ?.name ||
                      'Class —'}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              onPress={closeWorkspace}
              hitSlop={12}
              style={styles.workspaceCloseBtn}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.workspaceTabBar,
              { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.workspaceTabRail}
            >
              {WORKSPACE_TABS.map((t) => {
                const active = workspaceTab === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => {
                      setWorkspaceTab(t.key);
                      setShowLogInteraction(false);
                    }}
                    activeOpacity={0.88}
                    style={[
                      styles.workspaceTab,
                      {
                        backgroundColor: active ? theme.colors.primary : theme.colors.background,
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.workspaceTabLabel,
                        {
                          color: active ? theme.colors.textInverse : theme.colors.textPrimary,
                        },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.workspaceBody,
              { paddingBottom: Math.max(insets.bottom, 16) + 24 },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {workspaceTab === 'overview' ? (
              <View style={styles.workspaceBlock}>
                <View
                  style={[
                    styles.infoCard,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                >
                  <View style={styles.infoCardRow}>
                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                      Source
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
                      {enquiryForm.source || '—'}
                    </Text>
                  </View>
                  <View style={[styles.infoDivider, { backgroundColor: theme.colors.border }]} />
                  <View style={styles.infoCardRow}>
                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                      Next follow-up
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]}>
                      {enquiryForm.nextFollowUpDate || 'Not set'}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.hintCard,
                    { backgroundColor: theme.colors.primary + '12', borderColor: theme.colors.primary + '33' },
                  ]}
                >
                  <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
                  <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>
                    Student and parent details come from the application. Use Quick Edit only for
                    phone/email corrections. Use Log interaction for calls and follow-ups.
                  </Text>
                </View>
              </View>
            ) : null}

            {workspaceTab === 'student' ? (
              <View
                style={[
                  styles.infoCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <MetaLine label="Applicant" value={enquiryForm.applicantName} />
                <View style={[styles.infoDivider, { backgroundColor: theme.colors.border }]} />
                <MetaLine
                  label="Class"
                  value={
                    adm.classes.find((c) => String(c.id) === enquiryForm.applyingForClass)?.name ||
                    editingEnquiry?.className ||
                    '—'
                  }
                />
                <View style={[styles.infoDivider, { backgroundColor: theme.colors.border }]} />
                <MetaLine label="Date of birth" value={enquiryForm.dateOfBirth || '—'} />
                <View style={[styles.infoDivider, { backgroundColor: theme.colors.border }]} />
                <MetaLine label="Gender" value={enumLabel(enquiryForm.gender) || '—'} />
                <View style={[styles.infoDivider, { backgroundColor: theme.colors.border }]} />
                <MetaLine
                  label="APAAR ID"
                  value={enquiryForm.apaarId ? formatApaarId(enquiryForm.apaarId) : '—'}
                />
                <View style={[styles.infoDivider, { backgroundColor: theme.colors.border }]} />
                <MetaLine label="Previous school" value={enquiryForm.previousSchool || '—'} />
                <View style={[styles.infoDivider, { backgroundColor: theme.colors.border }]} />
                <MetaLine label="Application date" value={enquiryForm.applicationDate || '—'} />
              </View>
            ) : null}

            {workspaceTab === 'parent' ? (
              <View
                style={[
                  styles.infoCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <MetaLine label="Parent name" value={enquiryForm.parentName || '—'} />
                <View style={[styles.infoDivider, { backgroundColor: theme.colors.border }]} />
                <MetaLine label="Phone" value={enquiryForm.parentPhone || '—'} />
                <View style={[styles.infoDivider, { backgroundColor: theme.colors.border }]} />
                <MetaLine label="Email" value={enquiryForm.parentEmail || '—'} />
                <View style={[styles.infoDivider, { backgroundColor: theme.colors.border }]} />
                <MetaLine label="Address" value={enquiryForm.address || '—'} />
                <View style={[styles.infoDivider, { backgroundColor: theme.colors.border }]} />
                <MetaLine label="Children" value={enquiryForm.numberOfChild || '—'} />
              </View>
            ) : null}

            {workspaceTab === 'timeline' ? (
              <View style={styles.workspaceBlock}>
                <View
                  style={[
                    styles.infoCard,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                >
                  <Text style={[styles.timelineTitle, { color: theme.colors.textPrimary }]}>
                    Application created
                  </Text>
                  <Text style={[styles.timelineSub, { color: theme.colors.textSecondary }]}>
                    {enquiryForm.applicationDate || '—'}
                  </Text>
                </View>
                {enquiryForm.nextFollowUpDate ? (
                  <View
                    style={[
                      styles.infoCard,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                    ]}
                  >
                    <Text style={[styles.timelineTitle, { color: theme.colors.textPrimary }]}>
                      Follow-up scheduled
                    </Text>
                    <Text style={[styles.timelineSub, { color: theme.colors.textSecondary }]}>
                      {enquiryForm.nextFollowUpDate}
                    </Text>
                  </View>
                ) : null}
                {(enquiryForm.remarks || '')
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line, idx) => (
                    <View
                      key={`${idx}-${line.slice(0, 12)}`}
                      style={[
                        styles.infoCard,
                        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                      ]}
                    >
                      <Text style={[styles.timelineBody, { color: theme.colors.textPrimary }]}>
                        {line}
                      </Text>
                    </View>
                  ))}
                {!enquiryForm.remarks && !enquiryForm.nextFollowUpDate ? (
                  <EmptyState
                    icon="time-outline"
                    title="No interactions yet"
                    message="Use Log interaction / Call parent to add timeline entries."
                  />
                ) : null}
              </View>
            ) : null}

            {workspaceTab === 'quick_edit' ? (
              <View style={styles.workspaceBlock}>
                <View
                  style={[
                    styles.hintCard,
                    { backgroundColor: theme.colors.primary + '12', borderColor: theme.colors.primary + '33' },
                  ]}
                >
                  <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
                  <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>
                    Correct phone or email only. Other applicant fields stay on the parent
                    application.
                  </Text>
                </View>
                <View
                  style={[
                    styles.infoCard,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, gap: 4 },
                  ]}
                >
                  <FormField label="Parent name">
                    <TextField
                      value={enquiryForm.parentName}
                      onChangeText={(v) => setEnquiryForm((f) => ({ ...f, parentName: v }))}
                    />
                  </FormField>
                  <FormField label="Parent phone" required>
                    <TextField
                      value={enquiryForm.parentPhone}
                      onChangeText={(v) => setEnquiryForm((f) => ({ ...f, parentPhone: v }))}
                      keyboardType="phone-pad"
                    />
                  </FormField>
                  <FormField label="Parent email">
                    <TextField
                      value={enquiryForm.parentEmail}
                      onChangeText={(v) => setEnquiryForm((f) => ({ ...f, parentEmail: v }))}
                      keyboardType="email-address"
                    />
                  </FormField>
                  <FormField label="Next follow-up">
                    <TextField
                      value={enquiryForm.nextFollowUpDate}
                      onChangeText={(v) => setEnquiryForm((f) => ({ ...f, nextFollowUpDate: v }))}
                      placeholder="YYYY-MM-DD"
                    />
                  </FormField>
                  <PrimaryButton
                    label={adm.busy ? 'Saving…' : 'Save corrections'}
                    disabled={adm.busy}
                    onPress={() => void submitQuickEdit()}
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.workspaceBlock}>
              <Text style={[styles.workspaceSectionTitle, { color: theme.colors.textPrimary }]}>
                Today's actions
              </Text>
              <View
                style={[
                  styles.infoCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, gap: 10 },
                ]}
              >
                <PrimaryButton
                  label="Log interaction / Call parent"
                  onPress={() => {
                    setShowLogInteraction(true);
                    setWorkspaceTab('timeline');
                  }}
                />
                <PrimaryButton
                  label="Click to call"
                  variant="outline"
                  onPress={() => callParent(enquiryForm.parentPhone)}
                />
                {showLogInteraction ? (
                  <View style={{ gap: 10, marginTop: 4 }}>
                    <FormField label="Interaction note" required>
                      <TextField
                        value={logNote}
                        onChangeText={setLogNote}
                        placeholder="Called parent, left voicemail…"
                        multiline
                      />
                    </FormField>
                    <View style={styles.walkInActions}>
                      <CompactBtn
                        label="Cancel"
                        outline
                        onPress={() => {
                          setShowLogInteraction(false);
                          setLogNote('');
                        }}
                      />
                      <CompactBtn
                        label={adm.busy ? 'Saving…' : 'Save log'}
                        disabled={adm.busy}
                        onPress={() => void submitLogInteraction()}
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.workspaceBlock}>
              <Text style={[styles.workspaceSectionTitle, { color: theme.colors.textPrimary }]}>
                Move to
              </Text>
              <View style={styles.moveGrid}>
                {WORKSPACE_QUICK_MOVES.filter((m) => {
                  const currentKey = ADMISSION_PIPELINE_STAGES.find((s) =>
                    (s.match as readonly string[]).includes(
                      (editingEnquiry?.status || '').toLowerCase(),
                    ),
                  )?.key;
                  return m.key !== currentKey;
                }).map((move) => (
                  <TouchableOpacity
                    key={move.key}
                    disabled={adm.busy}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (!editingEnquiry) return;
                      void (async () => {
                        const ok = await adm.moveEnquiryStatus(editingEnquiry.id, move.key);
                        if (ok) closeWorkspace();
                        else Alert.alert('Move failed', adm.error || 'Could not change stage');
                      })();
                    }}
                    style={[
                      styles.moveChip,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        opacity: adm.busy ? 0.5 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: theme.colors.textPrimary,
                        fontWeight: '700',
                        fontSize: 13,
                        textAlign: 'center',
                      }}
                      numberOfLines={2}
                    >
                      {move.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {editingEnquiry?.isActive ? (
              <PrimaryButton
                label="Deactivate"
                variant="outline"
                onPress={() =>
                  confirmDeactivate('enquiry', () => {
                    void (async () => {
                      const ok = await adm.removeEnquiry(editingEnquiry.id);
                      if (ok) closeWorkspace();
                    })();
                  })
                }
              />
            ) : null}
          </ScrollView>
        </View>
      </Modal>

      {/* Visitor modal */}
      <Modal visible={visitorModal} animationType="slide" onRequestClose={() => setVisitorModal(false)}>
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingVisitor ? 'Edit Visitor' : 'Add Visitor'}
            </Text>
            <TouchableOpacity onPress={() => setVisitorModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="Purpose" required>
              <SelectField
                options={VISITOR_PURPOSE_OPTIONS.map((p) => ({ label: p.label, value: p.value }))}
                value={visitorForm.purpose}
                onChange={(v) => setVisitorForm((f) => ({ ...f, purpose: v }))}
              />
            </FormField>
            <FormField label="Meeting With" required>
              <SelectField
                options={meetingWithOpts}
                value={visitorForm.visitingWhom || null}
                onChange={(v) => setVisitorForm((f) => ({ ...f, visitingWhom: v }))}
                placeholder="Select or type…"
              />
            </FormField>
            <FormField label="Visitor Name" required>
              <TextField
                value={visitorForm.visitorName}
                onChangeText={(v) => setVisitorForm((f) => ({ ...f, visitorName: v }))}
              />
            </FormField>
            <FormField label="Phone">
              <TextField
                value={visitorForm.phone}
                onChangeText={(v) => setVisitorForm((f) => ({ ...f, phone: v }))}
                keyboardType="phone-pad"
              />
            </FormField>
            <FormField label="ID Type">
              <SelectField
                options={VISITOR_ID_TYPES.map((t) => ({ label: enumLabel(t), value: t }))}
                value={visitorForm.idType}
                onChange={(v) => setVisitorForm((f) => ({ ...f, idType: v }))}
              />
            </FormField>
            <FormField label="ID Number">
              <TextField
                value={visitorForm.idNumber}
                onChangeText={(v) => setVisitorForm((f) => ({ ...f, idNumber: v }))}
              />
            </FormField>
            <FormField label="Number of Persons">
              <TextField
                value={String(visitorForm.numberOfPerson)}
                onChangeText={(v) =>
                  setVisitorForm((f) => ({
                    ...f,
                    numberOfPerson: Math.max(1, Number(v) || 1),
                  }))
                }
                keyboardType="numeric"
              />
            </FormField>
            <FormField label="Date" required>
              <TextField
                value={visitorForm.visitDate}
                onChangeText={(v) => setVisitorForm((f) => ({ ...f, visitDate: v }))}
                placeholder="YYYY-MM-DD"
              />
            </FormField>
            <FormField label="In Time" required>
              <TextField
                value={visitorForm.inTime}
                onChangeText={(v) => setVisitorForm((f) => ({ ...f, inTime: v }))}
                placeholder="HH:MM"
              />
            </FormField>
            <FormField label="Out Time">
              <TextField
                value={visitorForm.outTime}
                onChangeText={(v) => setVisitorForm((f) => ({ ...f, outTime: v }))}
                placeholder="HH:MM"
              />
            </FormField>
            <FormField label="Status">
              <SelectField
                options={VISITOR_FORM_STATUSES.map((s) => ({ label: enumLabel(s), value: s }))}
                value={visitorForm.status}
                onChange={(v) => setVisitorForm((f) => ({ ...f, status: v }))}
              />
            </FormField>
            <FormField label="Note">
              <TextField
                value={visitorForm.note}
                onChangeText={(v) => setVisitorForm((f) => ({ ...f, note: v }))}
                multiline
              />
            </FormField>
            <PrimaryButton
              label={adm.busy ? 'Saving…' : 'Save'}
              disabled={adm.busy}
              onPress={() => {
                void (async () => {
                  const ok = await adm.saveVisitor(visitorForm, editingVisitor?.id);
                  if (ok) setVisitorModal(false);
                  else Alert.alert('Save failed', adm.error || 'Could not save visitor');
                })();
              }}
            />
            <PrimaryButton label="Cancel" variant="outline" onPress={() => setVisitorModal(false)} />
          </ScrollView>
        </View>
      </Modal>

      {/* Phone call modal */}
      <Modal visible={phoneModal} animationType="slide" onRequestClose={() => setPhoneModal(false)}>
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingPhone ? 'Edit Phone Call' : 'Add Phone Call'}
            </Text>
            <TouchableOpacity onPress={() => setPhoneModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="Name">
              <TextField
                value={phoneForm.name}
                onChangeText={(v) => setPhoneForm((f) => ({ ...f, name: v }))}
              />
            </FormField>
            <FormField label="Phone" required>
              <TextField
                value={phoneForm.phone}
                onChangeText={(v) => setPhoneForm((f) => ({ ...f, phone: v }))}
                keyboardType="phone-pad"
              />
            </FormField>
            <FormField label="Date" required>
              <TextField
                value={phoneForm.date}
                onChangeText={(v) => setPhoneForm((f) => ({ ...f, date: v }))}
                placeholder="YYYY-MM-DD"
              />
            </FormField>
            <FormField label="Description">
              <TextField
                value={phoneForm.description}
                onChangeText={(v) => setPhoneForm((f) => ({ ...f, description: v }))}
                multiline
              />
            </FormField>
            <FormField label="Next Follow-up">
              <TextField
                value={phoneForm.nextFollowUpDate}
                onChangeText={(v) => setPhoneForm((f) => ({ ...f, nextFollowUpDate: v }))}
                placeholder="YYYY-MM-DD"
              />
            </FormField>
            <FormField label="Duration">
              <TextField
                value={phoneForm.callDuration}
                onChangeText={(v) => setPhoneForm((f) => ({ ...f, callDuration: v }))}
              />
            </FormField>
            <FormField label="Note">
              <TextField
                value={phoneForm.note}
                onChangeText={(v) => setPhoneForm((f) => ({ ...f, note: v }))}
                multiline
              />
            </FormField>
            <FormField label="Call Type">
              <SelectField
                options={CALL_TYPES.map((t) => ({ label: enumLabel(t), value: t }))}
                value={phoneForm.callType}
                onChange={(v) => setPhoneForm((f) => ({ ...f, callType: v }))}
              />
            </FormField>
            <PrimaryButton
              label={adm.busy ? 'Saving…' : 'Save'}
              disabled={adm.busy}
              onPress={() => {
                void (async () => {
                  const ok = await adm.savePhoneCall(phoneForm, editingPhone?.id);
                  if (ok) setPhoneModal(false);
                  else Alert.alert('Save failed', adm.error || 'Could not save phone call');
                })();
              }}
            />
            <PrimaryButton label="Cancel" variant="outline" onPress={() => setPhoneModal(false)} />
          </ScrollView>
        </View>
      </Modal>

      {/* Postal dispatch modal */}
      <Modal visible={dispatchModal} animationType="slide" onRequestClose={() => setDispatchModal(false)}>
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingDispatch ? 'Edit Dispatch' : 'Add Dispatch'}
            </Text>
            <TouchableOpacity onPress={() => setDispatchModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="To Title" required>
              <TextField
                value={dispatchForm.toTitle}
                onChangeText={(v) => setDispatchForm((f) => ({ ...f, toTitle: v }))}
              />
            </FormField>
            <FormField label="Reference">
              <TextField
                value={dispatchForm.referenceNo}
                onChangeText={(v) => setDispatchForm((f) => ({ ...f, referenceNo: v }))}
              />
            </FormField>
            <FormField label="Address">
              <TextField
                value={dispatchForm.address}
                onChangeText={(v) => setDispatchForm((f) => ({ ...f, address: v }))}
                multiline
              />
            </FormField>
            <FormField label="Note">
              <TextField
                value={dispatchForm.note}
                onChangeText={(v) => setDispatchForm((f) => ({ ...f, note: v }))}
                multiline
              />
            </FormField>
            <FormField label="From Title">
              <TextField
                value={dispatchForm.fromTitle}
                onChangeText={(v) => setDispatchForm((f) => ({ ...f, fromTitle: v }))}
              />
            </FormField>
            <FormField label="Date">
              <TextField
                value={dispatchForm.date}
                onChangeText={(v) => setDispatchForm((f) => ({ ...f, date: v }))}
                placeholder="YYYY-MM-DD"
              />
            </FormField>
            <FormField label="Attachment Name">
              <TextField
                value={dispatchForm.attachmentName}
                onChangeText={(v) => setDispatchForm((f) => ({ ...f, attachmentName: v }))}
              />
            </FormField>
            <PrimaryButton
              label={adm.busy ? 'Saving…' : 'Save'}
              disabled={adm.busy}
              onPress={() => {
                void (async () => {
                  const ok = await adm.savePostalDispatch(dispatchForm, editingDispatch?.id);
                  if (ok) setDispatchModal(false);
                  else Alert.alert('Save failed', adm.error || 'Could not save dispatch');
                })();
              }}
            />
            <PrimaryButton label="Cancel" variant="outline" onPress={() => setDispatchModal(false)} />
          </ScrollView>
        </View>
      </Modal>

      {/* Postal receive modal */}
      <Modal visible={receiveModal} animationType="slide" onRequestClose={() => setReceiveModal(false)}>
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingReceive ? 'Edit Receive' : 'Add Receive'}
            </Text>
            <TouchableOpacity onPress={() => setReceiveModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="From Title" required>
              <TextField
                value={receiveForm.fromTitle}
                onChangeText={(v) => setReceiveForm((f) => ({ ...f, fromTitle: v }))}
              />
            </FormField>
            <FormField label="Reference">
              <TextField
                value={receiveForm.referenceNo}
                onChangeText={(v) => setReceiveForm((f) => ({ ...f, referenceNo: v }))}
              />
            </FormField>
            <FormField label="Address">
              <TextField
                value={receiveForm.address}
                onChangeText={(v) => setReceiveForm((f) => ({ ...f, address: v }))}
                multiline
              />
            </FormField>
            <FormField label="Note">
              <TextField
                value={receiveForm.note}
                onChangeText={(v) => setReceiveForm((f) => ({ ...f, note: v }))}
                multiline
              />
            </FormField>
            <FormField label="To Title">
              <TextField
                value={receiveForm.toTitle}
                onChangeText={(v) => setReceiveForm((f) => ({ ...f, toTitle: v }))}
              />
            </FormField>
            <FormField label="Date">
              <TextField
                value={receiveForm.date}
                onChangeText={(v) => setReceiveForm((f) => ({ ...f, date: v }))}
                placeholder="YYYY-MM-DD"
              />
            </FormField>
            <FormField label="Attachment Name">
              <TextField
                value={receiveForm.attachmentName}
                onChangeText={(v) => setReceiveForm((f) => ({ ...f, attachmentName: v }))}
              />
            </FormField>
            <PrimaryButton
              label={adm.busy ? 'Saving…' : 'Save'}
              disabled={adm.busy}
              onPress={() => {
                void (async () => {
                  const ok = await adm.savePostalReceive(receiveForm, editingReceive?.id);
                  if (ok) setReceiveModal(false);
                  else Alert.alert('Save failed', adm.error || 'Could not save receive record');
                })();
              }}
            />
            <PrimaryButton label="Cancel" variant="outline" onPress={() => setReceiveModal(false)} />
          </ScrollView>
        </View>
      </Modal>

      {/* Incident modal */}
      <Modal visible={incidentModal} animationType="slide" onRequestClose={() => setIncidentModal(false)}>
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingIncident ? 'Edit Incident' : 'Report Incident'}
            </Text>
            <TouchableOpacity onPress={() => setIncidentModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="Title" required>
              <TextField
                value={incidentForm.title}
                onChangeText={(v) => setIncidentForm((f) => ({ ...f, title: v }))}
              />
            </FormField>
            <FormField label="Type">
              <SelectField
                options={INCIDENT_TYPES.map((t) => ({ label: enumLabel(t), value: t }))}
                value={incidentForm.incidentType}
                onChange={(v) => setIncidentForm((f) => ({ ...f, incidentType: v }))}
              />
            </FormField>
            <FormField label="Severity">
              <SelectField
                options={SEVERITIES.map((s) => ({ label: s, value: s }))}
                value={incidentForm.severity}
                onChange={(v) => setIncidentForm((f) => ({ ...f, severity: v }))}
              />
            </FormField>
            <FormField label="Incident Date" required>
              <TextField
                value={incidentForm.incidentDate}
                onChangeText={(v) => setIncidentForm((f) => ({ ...f, incidentDate: v }))}
                placeholder="YYYY-MM-DD"
              />
            </FormField>
            <FormField label="Location">
              <TextField
                value={incidentForm.location}
                onChangeText={(v) => setIncidentForm((f) => ({ ...f, location: v }))}
              />
            </FormField>
            <FormField label="Reported By (ID)">
              <TextField
                value={incidentForm.reportedBy}
                onChangeText={(v) => setIncidentForm((f) => ({ ...f, reportedBy: v }))}
                keyboardType="number-pad"
              />
            </FormField>
            <FormField label="Witnesses">
              <TextField
                value={incidentForm.witnesses}
                onChangeText={(v) => setIncidentForm((f) => ({ ...f, witnesses: v }))}
              />
            </FormField>
            <FormField label="Involved Persons">
              <TextField
                value={incidentForm.involvedPersons}
                onChangeText={(v) => setIncidentForm((f) => ({ ...f, involvedPersons: v }))}
              />
            </FormField>
            <FormField label="Status">
              <SelectField
                options={INCIDENT_STATUSES.map((s) => ({ label: enumLabel(s), value: s }))}
                value={incidentForm.status}
                onChange={(v) => setIncidentForm((f) => ({ ...f, status: v }))}
              />
            </FormField>
            <FormField label="Description" required>
              <TextField
                value={incidentForm.description}
                onChangeText={(v) => setIncidentForm((f) => ({ ...f, description: v }))}
                multiline
              />
            </FormField>
            <FormField label="Action Taken">
              <TextField
                value={incidentForm.actionTaken}
                onChangeText={(v) => setIncidentForm((f) => ({ ...f, actionTaken: v }))}
                multiline
              />
            </FormField>
            <PrimaryButton
              label={adm.busy ? 'Saving…' : 'Save'}
              disabled={adm.busy}
              onPress={() => {
                void (async () => {
                  const ok = await adm.saveIncident(incidentForm, editingIncident?.id);
                  if (ok) setIncidentModal(false);
                  else Alert.alert('Save failed', adm.error || 'Could not save incident');
                })();
              }}
            />
            <PrimaryButton label="Cancel" variant="outline" onPress={() => setIncidentModal(false)} />
          </ScrollView>
        </View>
      </Modal>

      {/* Emergency contact modal */}
      <Modal visible={contactModal} animationType="slide" onRequestClose={() => setContactModal(false)}>
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
            </Text>
            <TouchableOpacity onPress={() => setContactModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="Name" required>
              <TextField
                value={contactForm.name}
                onChangeText={(v) => setContactForm((f) => ({ ...f, name: v }))}
              />
            </FormField>
            <FormField label="Role">
              <TextField
                value={contactForm.role}
                onChangeText={(v) => setContactForm((f) => ({ ...f, role: v }))}
              />
            </FormField>
            <FormField label="Phone" required>
              <TextField
                value={contactForm.phone}
                onChangeText={(v) => setContactForm((f) => ({ ...f, phone: v }))}
                keyboardType="phone-pad"
              />
            </FormField>
            <FormField label="Alternate Phone">
              <TextField
                value={contactForm.alternatePhone}
                onChangeText={(v) => setContactForm((f) => ({ ...f, alternatePhone: v }))}
                keyboardType="phone-pad"
              />
            </FormField>
            <FormField label="Email">
              <TextField
                value={contactForm.email}
                onChangeText={(v) => setContactForm((f) => ({ ...f, email: v }))}
                keyboardType="email-address"
              />
            </FormField>
            <FormField label="Contact Type">
              <SelectField
                options={CONTACT_TYPES.map((t) => ({ label: enumLabel(t), value: t }))}
                value={contactForm.contactType}
                onChange={(v) => setContactForm((f) => ({ ...f, contactType: v }))}
              />
            </FormField>
            <CheckRow
              label="Set as primary emergency contact"
              checked={contactForm.isPrimary}
              onToggle={() => setContactForm((f) => ({ ...f, isPrimary: !f.isPrimary }))}
            />
            <PrimaryButton
              label={adm.busy ? 'Saving…' : 'Save'}
              disabled={adm.busy}
              onPress={() => {
                void (async () => {
                  const ok = await adm.saveContact(contactForm, editingContact?.id);
                  if (ok) setContactModal(false);
                  else Alert.alert('Save failed', adm.error || 'Could not save contact');
                })();
              }}
            />
            <PrimaryButton label="Cancel" variant="outline" onPress={() => setContactModal(false)} />
          </ScrollView>
        </View>
      </Modal>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14, paddingBottom: 32 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  heroTitle: { fontSize: 22, fontWeight: '800', marginTop: 2, marginBottom: 4 },
  walkInOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  walkInCard: {
    borderRadius: 16,
    padding: 18,
    gap: 4,
  },
  walkInActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  workspaceRoot: {
    flex: 1,
  },
  workspaceHeader: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  workspaceEyebrow: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  workspaceName: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 6,
    lineHeight: 32,
  },
  workspaceMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  workspaceChip: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
    maxWidth: '100%',
  },
  workspaceChipStrong: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  workspaceChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  workspaceCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  workspaceTabBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  workspaceTabRail: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  workspaceTab: {
    flexShrink: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workspaceTabLabel: {
    fontSize: 13,
    fontWeight: '700',
    includeFontPadding: false,
  },
  workspaceBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 18,
  },
  workspaceBlock: {
    gap: 12,
  },
  workspaceSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  infoCardRow: {
    paddingVertical: 14,
  },
  infoDivider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  detailRow: {
    paddingVertical: 14,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '800',
    paddingTop: 12,
  },
  timelineSub: {
    fontSize: 12,
    marginTop: 4,
    paddingBottom: 12,
  },
  timelineBody: {
    fontSize: 13,
    lineHeight: 20,
    paddingVertical: 12,
  },
  moveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moveChip: {
    width: '47%',
    minHeight: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
  tabTitle: { fontSize: 14, fontWeight: '700' },
  tabSub: { fontSize: 11, lineHeight: 15, marginTop: 4 },
  section: { gap: 12 },
  pipelineTitle: { fontSize: 18, fontWeight: '800' },
  pipelineRailTitle: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  pipelineStageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  pipelineNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBar: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  stepSegments: { flexDirection: 'row', gap: 3 },
  stepSeg: { flex: 1, height: 4, borderRadius: 2 },
  viewToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  viewToggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stageHeading: { fontSize: 17, fontWeight: '800', marginTop: 4 },
  boardWrap: { gap: 10, marginTop: 4 },
  boardJumpRail: { gap: 8, paddingRight: 8, paddingVertical: 2 },
  boardJumpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  boardJumpCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  boardRow: {
    paddingRight: 16,
    paddingBottom: 8,
    alignItems: 'stretch',
  },
  boardCol: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
    minHeight: 320,
  },
  boardColHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  boardColTitle: {
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 20,
  },
  boardCountBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  boardColScroll: {
    maxHeight: 360,
  },
  boardColScrollContent: {
    gap: 10,
    paddingBottom: 4,
  },
  boardEmpty: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
  },
  boardCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
  },
  stageRail: { gap: 8, paddingVertical: 4 },
  stageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stageCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  listRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  rowName: { fontSize: 15, fontWeight: '700' },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginTop: 10,
  },
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
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  modalRoot: { flex: 1, paddingTop: 48 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', flex: 1, paddingRight: 12 },
  modalBody: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
});
