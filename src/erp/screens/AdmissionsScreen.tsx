/**
 * Admissions Screen
 * Sub-tabs: Enquiries | Visitor Register | Incidents | Emergency Contacts | Front Office
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Alert, RefreshControl } from 'react-native';
import {
  admissionsApi,
  visitorsApi,
  incidentsApi,
  emergencyContactsApi,
  phoneCallLogsApi,
  postalDispatchApi,
  postalReceiveApi,
} from '../../core/api/erp.api';
import {
  COLORS,
  SubTabBar,
  SearchBar,
  SectionHeader,
  ListRow,
  LoadingState,
  EmptyState,
  Pagination,
  FormModal,
  FormField,
  StyledInput,
  SimpleSelect,
  StatusBadge,
} from '../components/common';
import { useErpRole } from '../hooks/useErpRole';

const ADMISSION_STATUSES = [
  'enquiry', 'applied', 'entrance_test', 'interview',
  'offered', 'accepted', 'enrolled', 'rejected', 'withdrawn',
].map((s) => ({ label: s.replace(/_/g, ' '), value: s }));

const INCIDENT_TYPES = [
  'accident', 'injury', 'fight', 'theft', 'vandalism', 'fire',
  'medical', 'bullying', 'trespassing', 'general', 'other',
].map((s) => ({ label: s.replace(/_/g, ' '), value: s }));

const SEVERITY = ['low', 'medium', 'high', 'critical'].map((s) => ({ label: s, value: s }));

const TABS = [
  { key: 'enquiries', label: 'Enquiries' },
  { key: 'visitors', label: 'Visitors' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'emergency', label: 'Emergency' },
  { key: 'calls', label: 'Phone Calls' },
  { key: 'postal_dispatch', label: 'Dispatch' },
  { key: 'postal_receive', label: 'Receive' },
];

const PER_PAGE = 25;

// Reusable hook for a single CRUD section
function useCrudSection(apiModule: any, baseParams: Record<string, any>) {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const data = await apiModule.getAll({
        page: p, per_page: PER_PAGE,
        q: search || undefined, ...baseParams,
      });
      setItems(data?.items ?? data ?? []);
      setTotal(data?.total ?? (data?.items?.length ?? 0));
      setPage(p);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, JSON.stringify(baseParams)]);

  useEffect(() => {
    const t = setTimeout(() => load(1), 300);
    return () => clearTimeout(t);
  }, [search]);

  const openAdd = () => { setEditingId(null); setForm({}); setShowModal(true); };
  const openEdit = (item: any) => { setEditingId(item.id); setForm({ ...item }); setShowModal(true); };

  const save = async () => {
    setSaving(true);
    try {
      if (editingId) await apiModule.update(editingId, { ...form, ...baseParams });
      else await apiModule.create({ ...form, ...baseParams });
      setShowModal(false);
      load(page);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: any) => {
    try {
      await apiModule.softDelete(id);
      load(page);
    } catch {
      Alert.alert('Error', 'Delete failed.');
    }
  };

  return {
    items, total, page, search, setSearch, loading, refreshing, setRefreshing,
    showModal, setShowModal, saving, form, setForm, editingId,
    load, openAdd, openEdit, save, remove,
  };
}

export default function AdmissionsScreen() {
  const { schoolId, isAdmin } = useErpRole();
  const [activeTab, setActiveTab] = useState('enquiries');
  const baseParams = schoolId ? { school_id: schoolId } : {};

  const enquiries = useCrudSection(admissionsApi, baseParams);
  const visitors = useCrudSection(visitorsApi, baseParams);
  const incidents = useCrudSection(incidentsApi, baseParams);
  const emergency = useCrudSection(emergencyContactsApi, baseParams);
  const calls = useCrudSection(phoneCallLogsApi, baseParams);
  const postalDispatch = useCrudSection(postalDispatchApi, baseParams);
  const postalReceive = useCrudSection(postalReceiveApi, baseParams);

  useEffect(() => {
    if (activeTab === 'enquiries') enquiries.load(1);
    else if (activeTab === 'visitors') visitors.load(1);
    else if (activeTab === 'incidents') incidents.load(1);
    else if (activeTab === 'emergency') emergency.load(1);
    else if (activeTab === 'calls') calls.load(1);
    else if (activeTab === 'postal_dispatch') postalDispatch.load(1);
    else if (activeTab === 'postal_receive') postalReceive.load(1);
  }, [activeTab]);

  const section =
    activeTab === 'enquiries' ? enquiries
    : activeTab === 'visitors' ? visitors
    : activeTab === 'incidents' ? incidents
    : activeTab === 'calls' ? calls
    : activeTab === 'postal_dispatch' ? postalDispatch
    : activeTab === 'postal_receive' ? postalReceive
    : emergency;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.gray[50] }}>
      <SubTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <SearchBar value={section.search} onChangeText={section.setSearch} />

      <ScrollView
        refreshControl={<RefreshControl refreshing={section.refreshing} onRefresh={() => { section.setRefreshing(true); section.load(section.page); }} />}
      >
        <SectionHeader
          title={`${section.total} Records`}
          onAdd={isAdmin ? section.openAdd : undefined}
        />
        {section.loading ? (
          <LoadingState />
        ) : section.items.length === 0 ? (
          <EmptyState />
        ) : (
          section.items.map((item: any) => (
            <ListRow
              key={item.id}
              title={
                item.student_name ?? item.visitor_name ?? item.name ??
                item.contact_name ?? `#${item.id}`
              }
              subtitle={
                item.status ? item.status.replace(/_/g, ' ') :
                item.purpose ?? item.incident_type ?? item.phone ?? ''
              }
              rightComponent={item.status ? <StatusBadge status={item.status} /> : undefined}
              onEdit={isAdmin ? () => section.openEdit(item) : undefined}
              onDelete={isAdmin ? () => section.remove(item.id) : undefined}
            />
          ))
        )}
        <Pagination
          page={section.page} total={section.total} perPage={PER_PAGE}
          onPrev={() => section.load(section.page - 1)}
          onNext={() => section.load(section.page + 1)}
        />
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Enquiries modal ── */}
      {activeTab === 'enquiries' && (
        <FormModal visible={enquiries.showModal} title={enquiries.editingId ? 'Edit Enquiry' : 'New Enquiry'} onClose={() => enquiries.setShowModal(false)} onSave={enquiries.save} saving={enquiries.saving}>
          <FormField label="Student Name" required>
            <StyledInput value={enquiries.form.student_name ?? ''} onChangeText={(v) => enquiries.setForm((f: any) => ({ ...f, student_name: v }))} placeholder="Full name" />
          </FormField>
          <FormField label="Parent Name">
            <StyledInput value={enquiries.form.parent_name ?? ''} onChangeText={(v) => enquiries.setForm((f: any) => ({ ...f, parent_name: v }))} placeholder="Parent/guardian name" />
          </FormField>
          <FormField label="Phone">
            <StyledInput value={enquiries.form.phone ?? ''} onChangeText={(v) => enquiries.setForm((f: any) => ({ ...f, phone: v }))} keyboardType="phone-pad" placeholder="Mobile number" />
          </FormField>
          <FormField label="Email">
            <StyledInput value={enquiries.form.email ?? ''} onChangeText={(v) => enquiries.setForm((f: any) => ({ ...f, email: v }))} keyboardType="email-address" placeholder="Email address" />
          </FormField>
          <FormField label="Applying for Class">
            <StyledInput value={enquiries.form.applying_for_class ?? ''} onChangeText={(v) => enquiries.setForm((f: any) => ({ ...f, applying_for_class: v }))} placeholder="Class name" />
          </FormField>
          <FormField label="Status">
            <SimpleSelect options={ADMISSION_STATUSES} value={enquiries.form.status ?? 'enquiry'} onChange={(v) => enquiries.setForm((f: any) => ({ ...f, status: v }))} />
          </FormField>
          <FormField label="Remarks">
            <StyledInput value={enquiries.form.remarks ?? ''} onChangeText={(v) => enquiries.setForm((f: any) => ({ ...f, remarks: v }))} multiline numberOfLines={3} placeholder="Additional notes" />
          </FormField>
        </FormModal>
      )}

      {/* ── Visitors modal ── */}
      {activeTab === 'visitors' && (
        <FormModal visible={visitors.showModal} title={visitors.editingId ? 'Edit Visitor' : 'New Visitor'} onClose={() => visitors.setShowModal(false)} onSave={visitors.save} saving={visitors.saving}>
          <FormField label="Visitor Name" required>
            <StyledInput value={visitors.form.visitor_name ?? ''} onChangeText={(v) => visitors.setForm((f: any) => ({ ...f, visitor_name: v }))} placeholder="Full name" />
          </FormField>
          <FormField label="Phone">
            <StyledInput value={visitors.form.phone ?? ''} onChangeText={(v) => visitors.setForm((f: any) => ({ ...f, phone: v }))} keyboardType="phone-pad" />
          </FormField>
          <FormField label="Purpose">
            <StyledInput value={visitors.form.purpose ?? ''} onChangeText={(v) => visitors.setForm((f: any) => ({ ...f, purpose: v }))} placeholder="Purpose of visit" />
          </FormField>
          <FormField label="Meeting With">
            <StyledInput value={visitors.form.meeting_with ?? ''} onChangeText={(v) => visitors.setForm((f: any) => ({ ...f, meeting_with: v }))} placeholder="Person to meet" />
          </FormField>
          <FormField label="In Time">
            <StyledInput value={visitors.form.in_time ?? ''} onChangeText={(v) => visitors.setForm((f: any) => ({ ...f, in_time: v }))} placeholder="HH:MM" />
          </FormField>
          <FormField label="Out Time">
            <StyledInput value={visitors.form.out_time ?? ''} onChangeText={(v) => visitors.setForm((f: any) => ({ ...f, out_time: v }))} placeholder="HH:MM" />
          </FormField>
          <FormField label="Badge Number">
            <StyledInput value={visitors.form.badge_number ?? ''} onChangeText={(v) => visitors.setForm((f: any) => ({ ...f, badge_number: v }))} />
          </FormField>
          <FormField label="Vehicle Number">
            <StyledInput value={visitors.form.vehicle_number ?? ''} onChangeText={(v) => visitors.setForm((f: any) => ({ ...f, vehicle_number: v }))} />
          </FormField>
        </FormModal>
      )}

      {/* ── Incidents modal ── */}
      {activeTab === 'incidents' && (
        <FormModal visible={incidents.showModal} title={incidents.editingId ? 'Edit Incident' : 'New Incident'} onClose={() => incidents.setShowModal(false)} onSave={incidents.save} saving={incidents.saving}>
          <FormField label="Title" required>
            <StyledInput value={incidents.form.title ?? ''} onChangeText={(v) => incidents.setForm((f: any) => ({ ...f, title: v }))} placeholder="Incident title" />
          </FormField>
          <FormField label="Incident Type">
            <SimpleSelect options={INCIDENT_TYPES} value={incidents.form.incident_type ?? 'general'} onChange={(v) => incidents.setForm((f: any) => ({ ...f, incident_type: v }))} />
          </FormField>
          <FormField label="Severity">
            <SimpleSelect options={SEVERITY} value={incidents.form.severity ?? 'low'} onChange={(v) => incidents.setForm((f: any) => ({ ...f, severity: v }))} />
          </FormField>
          <FormField label="Date">
            <StyledInput value={incidents.form.incident_date ?? ''} onChangeText={(v) => incidents.setForm((f: any) => ({ ...f, incident_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Description">
            <StyledInput value={incidents.form.description ?? ''} onChangeText={(v) => incidents.setForm((f: any) => ({ ...f, description: v }))} multiline numberOfLines={4} placeholder="What happened?" />
          </FormField>
        </FormModal>
      )}

      {/* ── Emergency Contacts modal ── */}
      {activeTab === 'emergency' && (
        <FormModal visible={emergency.showModal} title={emergency.editingId ? 'Edit Contact' : 'New Contact'} onClose={() => emergency.setShowModal(false)} onSave={emergency.save} saving={emergency.saving}>
          <FormField label="Contact Name" required>
            <StyledInput value={emergency.form.contact_name ?? ''} onChangeText={(v) => emergency.setForm((f: any) => ({ ...f, contact_name: v }))} placeholder="Full name" />
          </FormField>
          <FormField label="Relation">
            <StyledInput value={emergency.form.relation ?? ''} onChangeText={(v) => emergency.setForm((f: any) => ({ ...f, relation: v }))} placeholder="Parent / Guardian" />
          </FormField>
          <FormField label="Phone" required>
            <StyledInput value={emergency.form.phone ?? ''} onChangeText={(v) => emergency.setForm((f: any) => ({ ...f, phone: v }))} keyboardType="phone-pad" />
          </FormField>
          <FormField label="Alternate Phone">
            <StyledInput value={emergency.form.alternate_phone ?? ''} onChangeText={(v) => emergency.setForm((f: any) => ({ ...f, alternate_phone: v }))} keyboardType="phone-pad" />
          </FormField>
        </FormModal>
      )}

      {/* ── Phone Call Logs modal ── */}
      {activeTab === 'calls' && (
        <FormModal visible={calls.showModal} title={calls.editingId ? 'Edit Call Log' : 'New Call Log'} onClose={() => calls.setShowModal(false)} onSave={calls.save} saving={calls.saving}>
          <FormField label="Caller Name" required>
            <StyledInput value={calls.form.caller_name ?? ''} onChangeText={(v) => calls.setForm((f: any) => ({ ...f, caller_name: v }))} placeholder="Full name" />
          </FormField>
          <FormField label="Phone" required>
            <StyledInput value={calls.form.phone ?? ''} onChangeText={(v) => calls.setForm((f: any) => ({ ...f, phone: v }))} keyboardType="phone-pad" />
          </FormField>
          <FormField label="Purpose">
            <StyledInput value={calls.form.purpose ?? ''} onChangeText={(v) => calls.setForm((f: any) => ({ ...f, purpose: v }))} placeholder="Purpose of call" />
          </FormField>
          <FormField label="Date">
            <StyledInput value={calls.form.call_date ?? ''} onChangeText={(v) => calls.setForm((f: any) => ({ ...f, call_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Duration (mins)">
            <StyledInput value={String(calls.form.duration_minutes ?? '')} onChangeText={(v) => calls.setForm((f: any) => ({ ...f, duration_minutes: v }))} keyboardType="numeric" />
          </FormField>
          <FormField label="Remarks">
            <StyledInput value={calls.form.remarks ?? ''} onChangeText={(v) => calls.setForm((f: any) => ({ ...f, remarks: v }))} multiline />
          </FormField>
        </FormModal>
      )}

      {/* ── Postal Dispatch modal ── */}
      {activeTab === 'postal_dispatch' && (
        <FormModal visible={postalDispatch.showModal} title={postalDispatch.editingId ? 'Edit Dispatch' : 'New Dispatch'} onClose={() => postalDispatch.setShowModal(false)} onSave={postalDispatch.save} saving={postalDispatch.saving}>
          <FormField label="To Name" required>
            <StyledInput value={postalDispatch.form.to_name ?? ''} onChangeText={(v) => postalDispatch.setForm((f: any) => ({ ...f, to_name: v }))} placeholder="Recipient name" />
          </FormField>
          <FormField label="To Address">
            <StyledInput value={postalDispatch.form.to_address ?? ''} onChangeText={(v) => postalDispatch.setForm((f: any) => ({ ...f, to_address: v }))} multiline placeholder="Address" />
          </FormField>
          <FormField label="Reference Number">
            <StyledInput value={postalDispatch.form.reference_number ?? ''} onChangeText={(v) => postalDispatch.setForm((f: any) => ({ ...f, reference_number: v }))} placeholder="REF-001" />
          </FormField>
          <FormField label="Dispatch Date">
            <StyledInput value={postalDispatch.form.dispatch_date ?? ''} onChangeText={(v) => postalDispatch.setForm((f: any) => ({ ...f, dispatch_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Remarks">
            <StyledInput value={postalDispatch.form.remarks ?? ''} onChangeText={(v) => postalDispatch.setForm((f: any) => ({ ...f, remarks: v }))} multiline />
          </FormField>
        </FormModal>
      )}

      {/* ── Postal Receive modal ── */}
      {activeTab === 'postal_receive' && (
        <FormModal visible={postalReceive.showModal} title={postalReceive.editingId ? 'Edit Receipt' : 'New Receipt'} onClose={() => postalReceive.setShowModal(false)} onSave={postalReceive.save} saving={postalReceive.saving}>
          <FormField label="From Name" required>
            <StyledInput value={postalReceive.form.from_name ?? ''} onChangeText={(v) => postalReceive.setForm((f: any) => ({ ...f, from_name: v }))} placeholder="Sender name" />
          </FormField>
          <FormField label="From Address">
            <StyledInput value={postalReceive.form.from_address ?? ''} onChangeText={(v) => postalReceive.setForm((f: any) => ({ ...f, from_address: v }))} multiline placeholder="Address" />
          </FormField>
          <FormField label="Reference Number">
            <StyledInput value={postalReceive.form.reference_number ?? ''} onChangeText={(v) => postalReceive.setForm((f: any) => ({ ...f, reference_number: v }))} placeholder="REF-001" />
          </FormField>
          <FormField label="Received Date">
            <StyledInput value={postalReceive.form.received_date ?? ''} onChangeText={(v) => postalReceive.setForm((f: any) => ({ ...f, received_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Remarks">
            <StyledInput value={postalReceive.form.remarks ?? ''} onChangeText={(v) => postalReceive.setForm((f: any) => ({ ...f, remarks: v }))} multiline />
          </FormField>
        </FormModal>
      )}
    </View>
  );
}
