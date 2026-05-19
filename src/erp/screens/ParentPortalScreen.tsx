/**
 * Parent Portal Screen
 * Sub-tabs: PTM Schedules | Appointments | Communications
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Alert, RefreshControl } from 'react-native';
import { ptmSchedulesApi, ptmAppointmentsApi, parentCommunicationsApi } from '../../core/api/erp.api';
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

const APPOINTMENT_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'].map((s) => ({ label: s, value: s }));
const COMM_TYPES = ['message', 'feedback', 'complaint', 'request', 'notice'].map((t) => ({ label: t, value: t }));

const TABS = [
  { key: 'schedules', label: 'PTM Schedules' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'communications', label: 'Communications' },
];

const PER_PAGE = 25;

function useCrud(apiModule: any, baseParams: Record<string, any>) {
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
      const data = await apiModule.list({ page: p, per_page: PER_PAGE, q: search || undefined, ...baseParams });
      setItems(data?.items ?? data ?? []);
      setTotal(data?.total ?? (data?.items?.length ?? 0));
      setPage(p);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, JSON.stringify(baseParams)]);

  useEffect(() => { const t = setTimeout(() => load(1), 300); return () => clearTimeout(t); }, [search]);

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
    try { await apiModule.softDelete(id); load(page); }
    catch { Alert.alert('Error', 'Delete failed.'); }
  };

  return { items, total, page, search, setSearch, loading, refreshing, setRefreshing,
    showModal, setShowModal, saving, form, setForm, editingId,
    load, openAdd, openEdit, save, remove };
}

export default function ParentPortalScreen() {
  const { schoolId, isAdmin } = useErpRole();
  const [activeTab, setActiveTab] = useState('schedules');
  const baseParams = schoolId ? { school_id: schoolId } : {};

  const schedules = useCrud(ptmSchedulesApi, baseParams);
  const appointments = useCrud(ptmAppointmentsApi, baseParams);
  const communications = useCrud(parentCommunicationsApi, baseParams);

  useEffect(() => {
    if (activeTab === 'schedules') schedules.load(1);
    else if (activeTab === 'appointments') appointments.load(1);
    else communications.load(1);
  }, [activeTab]);

  const sectionMap: Record<string, any> = { schedules, appointments, communications };
  const section = sectionMap[activeTab];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.gray[50] }}>
      <SubTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <SearchBar value={section.search} onChangeText={section.setSearch} />

      <ScrollView
        refreshControl={<RefreshControl refreshing={section.refreshing} onRefresh={() => { section.setRefreshing(true); section.load(section.page); }} />}
      >
        <SectionHeader
          title={`${section.total} Records`}
          onAdd={isAdmin || activeTab === 'appointments' || activeTab === 'communications' ? section.openAdd : undefined}
        />
        {section.loading ? <LoadingState /> : section.items.length === 0 ? <EmptyState /> : (
          section.items.map((item: any) => (
            <ListRow
              key={item.id}
              title={item.title ?? item.teacher_name ?? item.parent_name ?? `#${item.id}`}
              subtitle={[
                item.scheduled_date,
                item.time_slot,
                item.communication_type,
              ].filter(Boolean).join(' · ')}
              rightComponent={item.status ? <StatusBadge status={item.status} /> : undefined}
              onEdit={isAdmin ? () => section.openEdit(item) : undefined}
              onDelete={isAdmin ? () => section.remove(item.id) : undefined}
            />
          ))
        )}
        <Pagination page={section.page} total={section.total} perPage={PER_PAGE} onPrev={() => section.load(section.page - 1)} onNext={() => section.load(section.page + 1)} />
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── PTM Schedule modal ── */}
      {activeTab === 'schedules' && (
        <FormModal visible={schedules.showModal} title={schedules.editingId ? 'Edit PTM Schedule' : 'New PTM Schedule'} onClose={() => schedules.setShowModal(false)} onSave={schedules.save} saving={schedules.saving}>
          <FormField label="Title" required>
            <StyledInput value={schedules.form.title ?? ''} onChangeText={(v) => schedules.setForm((f: any) => ({ ...f, title: v }))} placeholder="e.g. Term 1 PTM" />
          </FormField>
          <FormField label="Scheduled Date" required>
            <StyledInput value={schedules.form.scheduled_date ?? ''} onChangeText={(v) => schedules.setForm((f: any) => ({ ...f, scheduled_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Start Time">
            <StyledInput value={schedules.form.start_time ?? ''} onChangeText={(v) => schedules.setForm((f: any) => ({ ...f, start_time: v }))} placeholder="HH:MM" />
          </FormField>
          <FormField label="End Time">
            <StyledInput value={schedules.form.end_time ?? ''} onChangeText={(v) => schedules.setForm((f: any) => ({ ...f, end_time: v }))} placeholder="HH:MM" />
          </FormField>
          <FormField label="Venue">
            <StyledInput value={schedules.form.venue ?? ''} onChangeText={(v) => schedules.setForm((f: any) => ({ ...f, venue: v }))} />
          </FormField>
          <FormField label="Instructions">
            <StyledInput value={schedules.form.instructions ?? ''} onChangeText={(v) => schedules.setForm((f: any) => ({ ...f, instructions: v }))} multiline />
          </FormField>
        </FormModal>
      )}

      {/* ── Appointment modal ── */}
      {activeTab === 'appointments' && (
        <FormModal visible={appointments.showModal} title={appointments.editingId ? 'Edit Appointment' : 'Book Appointment'} onClose={() => appointments.setShowModal(false)} onSave={appointments.save} saving={appointments.saving}>
          <FormField label="Time Slot" required>
            <StyledInput value={appointments.form.time_slot ?? ''} onChangeText={(v) => appointments.setForm((f: any) => ({ ...f, time_slot: v }))} placeholder="HH:MM – HH:MM" />
          </FormField>
          <FormField label="Notes">
            <StyledInput value={appointments.form.notes ?? ''} onChangeText={(v) => appointments.setForm((f: any) => ({ ...f, notes: v }))} multiline />
          </FormField>
          {isAdmin && (
            <FormField label="Status">
              <SimpleSelect options={APPOINTMENT_STATUSES} value={appointments.form.status ?? 'pending'} onChange={(v) => appointments.setForm((f: any) => ({ ...f, status: v }))} />
            </FormField>
          )}
        </FormModal>
      )}

      {/* ── Communication modal ── */}
      {activeTab === 'communications' && (
        <FormModal visible={communications.showModal} title={communications.editingId ? 'Edit Message' : 'New Message'} onClose={() => communications.setShowModal(false)} onSave={communications.save} saving={communications.saving}>
          <FormField label="Subject" required>
            <StyledInput value={communications.form.subject ?? ''} onChangeText={(v) => communications.setForm((f: any) => ({ ...f, subject: v }))} placeholder="Subject" />
          </FormField>
          <FormField label="Type">
            <SimpleSelect options={COMM_TYPES} value={communications.form.communication_type ?? 'message'} onChange={(v) => communications.setForm((f: any) => ({ ...f, communication_type: v }))} />
          </FormField>
          <FormField label="Message" required>
            <StyledInput value={communications.form.message ?? ''} onChangeText={(v) => communications.setForm((f: any) => ({ ...f, message: v }))} multiline numberOfLines={4} />
          </FormField>
        </FormModal>
      )}
    </View>
  );
}
