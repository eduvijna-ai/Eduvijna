/**
 * Admin Safety & Security hub — web SafetySecurityTab + safety APIs.
 * Tabs: Visitors | Incidents | Emergency Contacts
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
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import {
  useAdminSafetyData,
  VISIT_PURPOSES,
  VISITOR_STATUSES,
  INCIDENT_TYPES,
  SEVERITIES,
  INCIDENT_STATUSES,
  CONTACT_TYPES,
  type AdminSafetyTab,
  type VisitorRow,
  type IncidentRow,
  type EmergencyContactRow,
} from '../../../hooks/useAdminSafetyData';

const SAFETY_TABS: Array<{ key: AdminSafetyTab; title: string; subtitle: string }> = [
  {
    key: 'visitors',
    title: 'Visitors',
    subtitle: 'Register and track campus visitors.',
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

function labelize(s: string) {
  return s.replace(/_/g, ' ');
}

function optLabel(s: string) {
  return labelize(s);
}

function visitorStatusAccent(
  s: string,
  isActive: boolean,
): 'green' | 'orange' | 'red' | 'blue' | 'purple' | 'teal' {
  if (!isActive) return 'red';
  const v = s.toLowerCase();
  if (v === 'checked_in' || v === 'resolved') return 'green';
  if (v === 'checked_out' || v === 'closed' || v === 'pre_registered') return 'teal';
  if (v === 'denied' || v === 'cancelled' || v === 'escalated') return 'red';
  if (v === 'investigating' || v === 'action_taken') return 'orange';
  return 'purple';
}

function severityAccent(s: string): 'green' | 'orange' | 'red' | 'purple' {
  const v = s.toLowerCase();
  if (v === 'low') return 'green';
  if (v === 'medium') return 'orange';
  if (v === 'high' || v === 'critical') return 'red';
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
        Page {page}/{totalPages} ({total})
      </Text>
      <CompactBtn label="Prev" outline icon="chevron-back" onPress={onPrev} />
      <CompactBtn label="Next" outline icon="chevron-forward" onPress={onNext} />
    </View>
  );
}

export default function AdminSafetyScreen() {
  const theme = useTeacherTheme();
  const safety = useAdminSafetyData();
  const [tab, setTab] = useState<AdminSafetyTab>('visitors');

  const [visitorModal, setVisitorModal] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<VisitorRow | null>(null);
  const [visitorForm, setVisitorForm] = useState({
    visitorName: '',
    phone: '',
    email: '',
    purpose: 'general',
    visitingWhom: '',
    department: '',
    vehicleNumber: '',
    badgeNumber: '',
    status: 'checked_in',
    remarks: '',
  });

  const [incidentModal, setIncidentModal] = useState(false);
  const [editingIncident, setEditingIncident] = useState<IncidentRow | null>(null);
  const [incidentForm, setIncidentForm] = useState({
    title: '',
    incidentType: 'general',
    severity: 'medium',
    description: '',
    location: '',
    incidentDate: '',
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

  const purposeOpts = useMemo(
    () => [
      { label: 'All Purposes', value: '' },
      ...VISIT_PURPOSES.map((p) => ({ label: optLabel(p), value: p })),
    ],
    [],
  );

  const visitorStatusFilterOpts = useMemo(
    () => [
      { label: 'All Statuses', value: '' },
      ...VISITOR_STATUSES.map((s) => ({ label: optLabel(s), value: s })),
      { label: 'Deactivated Visitors', value: 'deactivated' },
    ],
    [],
  );

  const purposeFormOpts = useMemo(
    () => VISIT_PURPOSES.map((p) => ({ label: optLabel(p), value: p })),
    [],
  );

  const visitorStatusFormOpts = useMemo(
    () => VISITOR_STATUSES.map((s) => ({ label: optLabel(s), value: s })),
    [],
  );

  const incidentTypeOpts = useMemo(
    () => [
      { label: 'All incident types', value: '' },
      ...INCIDENT_TYPES.map((t) => ({ label: optLabel(t), value: t })),
    ],
    [],
  );

  const severityFilterOpts = useMemo(
    () => [
      { label: 'All severities', value: '' },
      ...SEVERITIES.map((s) => ({ label: s, value: s })),
    ],
    [],
  );

  const incidentTypeFormOpts = useMemo(
    () => INCIDENT_TYPES.map((t) => ({ label: optLabel(t), value: t })),
    [],
  );

  const severityFormOpts = useMemo(
    () => SEVERITIES.map((s) => ({ label: s, value: s })),
    [],
  );

  const incidentStatusOpts = useMemo(
    () => INCIDENT_STATUSES.map((s) => ({ label: optLabel(s), value: s })),
    [],
  );

  const contactTypeFilterOpts = useMemo(
    () => [
      { label: 'All contact types', value: '' },
      ...CONTACT_TYPES.map((t) => ({ label: optLabel(t), value: t })),
    ],
    [],
  );

  const contactTypeFormOpts = useMemo(
    () => CONTACT_TYPES.map((t) => ({ label: optLabel(t), value: t })),
    [],
  );

  const openVisitorCreate = () => {
    setEditingVisitor(null);
    setVisitorForm({
      visitorName: '',
      phone: '',
      email: '',
      purpose: 'general',
      visitingWhom: '',
      department: '',
      vehicleNumber: '',
      badgeNumber: '',
      status: 'checked_in',
      remarks: '',
    });
    setVisitorModal(true);
  };

  const openIncidentCreate = () => {
    setEditingIncident(null);
    setIncidentForm({
      title: '',
      incidentType: 'general',
      severity: 'medium',
      description: '',
      location: '',
      incidentDate: safety.today(),
      reportedBy: '',
      witnesses: '',
      involvedPersons: '',
      actionTaken: '',
      status: 'reported',
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
          title="Safety & Security"
          trailingIcon="refresh-outline"
          onTrailingPress={() => void safety.refetch()}
        />
      }
      contentStyle={styles.content}
    >
      {safety.status === 'loading' ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 12 }} />
      ) : null}
      {safety.error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{safety.error}</Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRail}
      >
        {SAFETY_TABS.map((t) => {
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

      {/* Visitors */}
      {tab === 'visitors' ? (
        <View style={styles.section}>
          <FormField label="Purpose">
            <SelectField
              value={safety.purposeFilter}
              onChange={safety.setPurpose}
              options={purposeOpts}
              placeholder="All Purposes"
            />
          </FormField>
          <FormField label="Status">
            <SelectField
              value={safety.visitorStatusFilter}
              onChange={safety.setVisitorStatus}
              options={visitorStatusFilterOpts}
              placeholder="All Statuses"
            />
          </FormField>
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {safety.visitorTotal} visitor{safety.visitorTotal === 1 ? '' : 's'}
            </Text>
            <CompactBtn
              label="Refresh"
              outline
              icon="refresh"
              onPress={() => void safety.loadVisitors()}
            />
            <CompactBtn label="Register Visitor" icon="add" onPress={openVisitorCreate} />
          </View>
          {safety.visitors.length === 0 ? (
            <EmptyState
              icon="shield-checkmark-outline"
              title="No visitors"
              message="Register a visitor to track campus access."
            />
          ) : (
            safety.visitors.map((v) => (
              <SurfaceCard key={v.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {v.visitorName}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      ID {v.id} · {v.phone || '—'}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      Visiting: {v.visitingWhom || '—'}
                    </Text>
                    <View style={styles.row}>
                      <Badge label={labelize(v.purpose)} accent="purple" />
                      <Badge
                        label={v.isActive ? labelize(v.status) : 'deactivated'}
                        accent={visitorStatusAccent(v.status, v.isActive)}
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.row}>
                  <CompactBtn
                    label="Edit"
                    outline
                    onPress={() => {
                      setEditingVisitor(v);
                      setVisitorForm({
                        visitorName: v.visitorName,
                        phone: v.phone,
                        email: v.email,
                        purpose: v.purpose || 'general',
                        visitingWhom: v.visitingWhom,
                        department: v.department,
                        vehicleNumber: v.vehicleNumber,
                        badgeNumber: v.badgeNumber,
                        status: v.status || 'checked_in',
                        remarks: v.remarks,
                      });
                      setVisitorModal(true);
                    }}
                  />
                  {v.isActive ? (
                    <CompactBtn
                      label="Deactivate"
                      outline
                      onPress={() =>
                        confirmDeactivate(v.visitorName, () =>
                          void safety.removeVisitor(v.id),
                        )
                      }
                    />
                  ) : (
                    <Text style={{ color: theme.colors.danger, fontWeight: '700', fontSize: 12 }}>
                      Deactivated
                    </Text>
                  )}
                </View>
              </SurfaceCard>
            ))
          )}
          <PaginationRow
            page={safety.visitorPage}
            totalPages={safety.visitorPages}
            total={safety.visitorTotal}
            onPrev={() =>
              safety.setVisitorPage(Math.max(1, safety.visitorPage - 1))
            }
            onNext={() =>
              safety.setVisitorPage(
                Math.min(safety.visitorPages, safety.visitorPage + 1),
              )
            }
          />
        </View>
      ) : null}

      {/* Incidents */}
      {tab === 'incidents' ? (
        <View style={styles.section}>
          <FormField label="Incident type">
            <SelectField
              value={safety.incidentTypeFilter}
              onChange={safety.setIncidentType}
              options={incidentTypeOpts}
              placeholder="All incident types"
            />
          </FormField>
          <FormField label="Severity">
            <SelectField
              value={safety.severityFilter}
              onChange={safety.setSeverity}
              options={severityFilterOpts}
              placeholder="All severities"
            />
          </FormField>
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {safety.incidentTotal} incident{safety.incidentTotal === 1 ? '' : 's'}
            </Text>
            <CompactBtn
              label="Refresh"
              outline
              icon="refresh"
              onPress={() => void safety.loadIncidents()}
            />
            <CompactBtn label="Report Incident" icon="add" onPress={openIncidentCreate} />
          </View>
          {safety.incidents.length === 0 ? (
            <EmptyState
              icon="warning-outline"
              title="No incidents"
              message="Report a campus safety incident to track resolution."
            />
          ) : (
            safety.incidents.map((i) => (
              <SurfaceCard key={i.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {i.title}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      ID {i.id} · {i.incidentDate || '—'}
                    </Text>
                    <View style={styles.row}>
                      <Badge label={labelize(i.incidentType)} accent="purple" />
                      <Badge label={i.severity} accent={severityAccent(i.severity)} />
                      <Badge
                        label={labelize(i.status)}
                        accent={visitorStatusAccent(i.status, true)}
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.row}>
                  <CompactBtn
                    label="Edit"
                    outline
                    onPress={() => {
                      setEditingIncident(i);
                      setIncidentForm({
                        title: i.title,
                        incidentType: i.incidentType || 'general',
                        severity: i.severity || 'medium',
                        description: i.description,
                        location: i.location,
                        incidentDate: i.incidentDate,
                        reportedBy: i.reportedBy != null ? String(i.reportedBy) : '',
                        witnesses: i.witnesses,
                        involvedPersons: i.involvedPersons,
                        actionTaken: i.actionTaken,
                        status: i.status || 'reported',
                      });
                      setIncidentModal(true);
                    }}
                  />
                  {i.isActive ? (
                    <CompactBtn
                      label="Deactivate"
                      outline
                      onPress={() =>
                        confirmDeactivate(i.title, () => void safety.removeIncident(i.id))
                      }
                    />
                  ) : (
                    <Text style={{ color: theme.colors.danger, fontWeight: '700', fontSize: 12 }}>
                      Deactivated
                    </Text>
                  )}
                </View>
              </SurfaceCard>
            ))
          )}
          <PaginationRow
            page={safety.incidentPage}
            totalPages={safety.incidentPages}
            total={safety.incidentTotal}
            onPrev={() =>
              safety.setIncidentPage(Math.max(1, safety.incidentPage - 1))
            }
            onNext={() =>
              safety.setIncidentPage(
                Math.min(safety.incidentPages, safety.incidentPage + 1),
              )
            }
          />
        </View>
      ) : null}

      {/* Emergency contacts */}
      {tab === 'emergency' ? (
        <View style={styles.section}>
          <FormField label="Contact type">
            <SelectField
              value={safety.contactTypeFilter}
              onChange={safety.setContactType}
              options={contactTypeFilterOpts}
              placeholder="All contact types"
            />
          </FormField>
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {safety.contactTotal} contact{safety.contactTotal === 1 ? '' : 's'}
            </Text>
            <CompactBtn
              label="Refresh"
              outline
              icon="refresh"
              onPress={() => void safety.loadContacts()}
            />
            <CompactBtn label="Add Contact" icon="add" onPress={openContactCreate} />
          </View>
          {safety.contacts.length === 0 ? (
            <EmptyState
              icon="call-outline"
              title="No emergency contacts"
              message="Add internal or external escalation contacts."
            />
          ) : (
            safety.contacts.map((c) => (
              <SurfaceCard key={c.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {c.name}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      ID {c.id} · {c.role || '—'} · {c.phone}
                    </Text>
                    <View style={styles.row}>
                      <Badge label={labelize(c.contactType)} accent="blue" />
                      {c.isPrimary ? <Badge label="Primary" accent="green" /> : null}
                      {!c.isActive ? <Badge label="deactivated" accent="red" /> : null}
                    </View>
                  </View>
                </View>
                <View style={styles.row}>
                  <CompactBtn
                    label="Edit"
                    outline
                    onPress={() => {
                      setEditingContact(c);
                      setContactForm({
                        name: c.name,
                        role: c.role,
                        phone: c.phone,
                        alternatePhone: c.alternatePhone,
                        email: c.email,
                        contactType: c.contactType || 'internal',
                        isPrimary: c.isPrimary,
                      });
                      setContactModal(true);
                    }}
                  />
                  {c.isActive ? (
                    <CompactBtn
                      label="Deactivate"
                      outline
                      onPress={() =>
                        confirmDeactivate(c.name, () => void safety.removeContact(c.id))
                      }
                    />
                  ) : (
                    <Text style={{ color: theme.colors.danger, fontWeight: '700', fontSize: 12 }}>
                      Deactivated
                    </Text>
                  )}
                </View>
              </SurfaceCard>
            ))
          )}
          <PaginationRow
            page={safety.contactPage}
            totalPages={safety.contactPages}
            total={safety.contactTotal}
            onPrev={() =>
              safety.setContactPage(Math.max(1, safety.contactPage - 1))
            }
            onNext={() =>
              safety.setContactPage(
                Math.min(safety.contactPages, safety.contactPage + 1),
              )
            }
          />
        </View>
      ) : null}

      {/* Register / Edit Visitor modal — web SafetySecurityTab fields */}
      <Modal
        visible={visitorModal}
        animationType="slide"
        onRequestClose={() => setVisitorModal(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingVisitor ? 'Edit Visitor' : 'Register Visitor'}
            </Text>
            <TouchableOpacity onPress={() => setVisitorModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="Name" required>
              <TextField
                value={visitorForm.visitorName}
                onChangeText={(t) => setVisitorForm((f) => ({ ...f, visitorName: t }))}
              />
            </FormField>
            <FormField label="Phone">
              <TextField
                value={visitorForm.phone}
                onChangeText={(t) => setVisitorForm((f) => ({ ...f, phone: t }))}
                keyboardType="phone-pad"
              />
            </FormField>
            <FormField label="Email">
              <TextField
                value={visitorForm.email}
                onChangeText={(t) => setVisitorForm((f) => ({ ...f, email: t }))}
                keyboardType="email-address"
              />
            </FormField>
            <FormField label="Purpose">
              <SelectField
                value={visitorForm.purpose}
                onChange={(v) => setVisitorForm((f) => ({ ...f, purpose: v }))}
                options={purposeFormOpts}
              />
            </FormField>
            <FormField label="Visiting Whom">
              <TextField
                value={visitorForm.visitingWhom}
                onChangeText={(t) => setVisitorForm((f) => ({ ...f, visitingWhom: t }))}
              />
            </FormField>
            <FormField label="Department">
              <TextField
                value={visitorForm.department}
                onChangeText={(t) => setVisitorForm((f) => ({ ...f, department: t }))}
              />
            </FormField>
            <FormField label="Vehicle Number">
              <TextField
                value={visitorForm.vehicleNumber}
                onChangeText={(t) => setVisitorForm((f) => ({ ...f, vehicleNumber: t }))}
              />
            </FormField>
            <FormField label="Badge Number">
              <TextField
                value={visitorForm.badgeNumber}
                onChangeText={(t) => setVisitorForm((f) => ({ ...f, badgeNumber: t }))}
              />
            </FormField>
            <FormField label="Status">
              <SelectField
                value={visitorForm.status}
                onChange={(v) => setVisitorForm((f) => ({ ...f, status: v }))}
                options={visitorStatusFormOpts}
              />
            </FormField>
            <FormField label="Remarks">
              <TextField
                value={visitorForm.remarks}
                onChangeText={(t) => setVisitorForm((f) => ({ ...f, remarks: t }))}
                multiline
              />
            </FormField>
            <PrimaryButton
              label={safety.busy ? 'Saving…' : 'Save'}
              disabled={safety.busy}
              onPress={() => {
                void (async () => {
                  const ok = await safety.saveVisitor(
                    {
                      visitorName: visitorForm.visitorName,
                      phone: visitorForm.phone,
                      email: visitorForm.email,
                      purpose: visitorForm.purpose,
                      visitingWhom: visitorForm.visitingWhom,
                      department: visitorForm.department,
                      vehicleNumber: visitorForm.vehicleNumber,
                      badgeNumber: visitorForm.badgeNumber,
                      status: visitorForm.status,
                      remarks: visitorForm.remarks,
                    },
                    editingVisitor?.id,
                  );
                  if (ok) setVisitorModal(false);
                  else Alert.alert('Save failed', safety.error || 'Could not save');
                })();
              }}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Report / Edit Incident modal */}
      <Modal
        visible={incidentModal}
        animationType="slide"
        onRequestClose={() => setIncidentModal(false)}
      >
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
                onChangeText={(t) => setIncidentForm((f) => ({ ...f, title: t }))}
              />
            </FormField>
            <FormField label="Type">
              <SelectField
                value={incidentForm.incidentType}
                onChange={(v) => setIncidentForm((f) => ({ ...f, incidentType: v }))}
                options={incidentTypeFormOpts}
              />
            </FormField>
            <FormField label="Severity">
              <SelectField
                value={incidentForm.severity}
                onChange={(v) => setIncidentForm((f) => ({ ...f, severity: v }))}
                options={severityFormOpts}
              />
            </FormField>
            <FormField label="Incident Date" required>
              <TextField
                value={incidentForm.incidentDate}
                onChangeText={(t) => setIncidentForm((f) => ({ ...f, incidentDate: t }))}
                placeholder="YYYY-MM-DD"
              />
            </FormField>
            <FormField label="Location">
              <TextField
                value={incidentForm.location}
                onChangeText={(t) => setIncidentForm((f) => ({ ...f, location: t }))}
              />
            </FormField>
            <FormField label="Reported By (ID)">
              <TextField
                value={incidentForm.reportedBy}
                onChangeText={(t) => setIncidentForm((f) => ({ ...f, reportedBy: t }))}
                keyboardType="number-pad"
              />
            </FormField>
            <FormField label="Witnesses">
              <TextField
                value={incidentForm.witnesses}
                onChangeText={(t) => setIncidentForm((f) => ({ ...f, witnesses: t }))}
              />
            </FormField>
            <FormField label="Involved Persons">
              <TextField
                value={incidentForm.involvedPersons}
                onChangeText={(t) => setIncidentForm((f) => ({ ...f, involvedPersons: t }))}
              />
            </FormField>
            <FormField label="Status">
              <SelectField
                value={incidentForm.status}
                onChange={(v) => setIncidentForm((f) => ({ ...f, status: v }))}
                options={incidentStatusOpts}
              />
            </FormField>
            <FormField label="Description" required>
              <TextField
                value={incidentForm.description}
                onChangeText={(t) => setIncidentForm((f) => ({ ...f, description: t }))}
                multiline
              />
            </FormField>
            <FormField label="Action Taken">
              <TextField
                value={incidentForm.actionTaken}
                onChangeText={(t) => setIncidentForm((f) => ({ ...f, actionTaken: t }))}
                multiline
              />
            </FormField>
            <PrimaryButton
              label={safety.busy ? 'Saving…' : 'Save'}
              disabled={safety.busy}
              onPress={() => {
                void (async () => {
                  const ok = await safety.saveIncident(
                    {
                      title: incidentForm.title,
                      incidentType: incidentForm.incidentType,
                      severity: incidentForm.severity,
                      description: incidentForm.description,
                      location: incidentForm.location,
                      incidentDate: incidentForm.incidentDate,
                      reportedBy: incidentForm.reportedBy,
                      witnesses: incidentForm.witnesses,
                      involvedPersons: incidentForm.involvedPersons,
                      actionTaken: incidentForm.actionTaken,
                      status: incidentForm.status,
                    },
                    editingIncident?.id,
                  );
                  if (ok) setIncidentModal(false);
                  else Alert.alert('Save failed', safety.error || 'Could not save');
                })();
              }}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Add / Edit Emergency Contact modal */}
      <Modal
        visible={contactModal}
        animationType="slide"
        onRequestClose={() => setContactModal(false)}
      >
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
                onChangeText={(t) => setContactForm((f) => ({ ...f, name: t }))}
              />
            </FormField>
            <FormField label="Role">
              <TextField
                value={contactForm.role}
                onChangeText={(t) => setContactForm((f) => ({ ...f, role: t }))}
              />
            </FormField>
            <FormField label="Phone" required>
              <TextField
                value={contactForm.phone}
                onChangeText={(t) => setContactForm((f) => ({ ...f, phone: t }))}
                keyboardType="phone-pad"
              />
            </FormField>
            <FormField label="Alternate Phone">
              <TextField
                value={contactForm.alternatePhone}
                onChangeText={(t) => setContactForm((f) => ({ ...f, alternatePhone: t }))}
                keyboardType="phone-pad"
              />
            </FormField>
            <FormField label="Email">
              <TextField
                value={contactForm.email}
                onChangeText={(t) => setContactForm((f) => ({ ...f, email: t }))}
                keyboardType="email-address"
              />
            </FormField>
            <FormField label="Contact Type">
              <SelectField
                value={contactForm.contactType}
                onChange={(v) => setContactForm((f) => ({ ...f, contactType: v }))}
                options={contactTypeFormOpts}
              />
            </FormField>
            <CheckRow
              label="Set as primary emergency contact"
              checked={contactForm.isPrimary}
              onToggle={() =>
                setContactForm((f) => ({ ...f, isPrimary: !f.isPrimary }))
              }
            />
            <PrimaryButton
              label={safety.busy ? 'Saving…' : 'Save'}
              disabled={safety.busy}
              onPress={() => {
                void (async () => {
                  const ok = await safety.saveContact(
                    {
                      name: contactForm.name,
                      role: contactForm.role,
                      phone: contactForm.phone,
                      alternatePhone: contactForm.alternatePhone,
                      email: contactForm.email,
                      contactType: contactForm.contactType,
                      isPrimary: contactForm.isPrimary,
                    },
                    editingContact?.id,
                  );
                  if (ok) setContactModal(false);
                  else Alert.alert('Save failed', safety.error || 'Could not save');
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
