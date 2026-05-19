/**
 * Engagement Screen
 * Sub-tabs: Councils | Members | Grievances | Events | Gallery
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Alert, RefreshControl } from 'react-native';
import {
  studentCouncilsApi,
  councilMembersApi,
  studentGrievancesApi,
  eventsApi,
  galleryApi,
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

const GRIEVANCE_STATUSES = ['open', 'in_progress', 'resolved', 'closed'].map((s) => ({ label: s, value: s }));
const GRIEVANCE_TYPES = ['academic', 'administrative', 'facility', 'personal', 'other'].map((t) => ({ label: t, value: t }));
const EVENT_TYPES = ['academic', 'cultural', 'sports', 'meeting', 'workshop', 'other'].map((t) => ({ label: t, value: t }));

const TABS = [
  { key: 'councils', label: 'Councils' },
  { key: 'members', label: 'Members' },
  { key: 'grievances', label: 'Grievances' },
  { key: 'events', label: 'Events' },
  { key: 'gallery', label: 'Gallery' },
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

export default function EngagementScreen() {
  const { schoolId, isAdmin } = useErpRole();
  const [activeTab, setActiveTab] = useState('councils');
  const baseParams = schoolId ? { school_id: schoolId } : {};

  const councils = useCrud(studentCouncilsApi, baseParams);
  const members = useCrud(councilMembersApi, baseParams);
  const grievances = useCrud(studentGrievancesApi, baseParams);
  const events = useCrud(eventsApi, baseParams);
  const gallery = useCrud(galleryApi, baseParams);

  useEffect(() => {
    if (activeTab === 'councils') councils.load(1);
    else if (activeTab === 'members') members.load(1);
    else if (activeTab === 'grievances') grievances.load(1);
    else if (activeTab === 'events') events.load(1);
    else gallery.load(1);
  }, [activeTab]);

  const sectionMap: Record<string, any> = { councils, members, grievances, events, gallery };
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
          onAdd={isAdmin || activeTab === 'grievances' ? section.openAdd : undefined}
        />
        {section.loading ? <LoadingState /> : section.items.length === 0 ? <EmptyState /> : (
          section.items.map((item: any) => (
            <ListRow
              key={item.id}
              title={item.name ?? item.title ?? item.event_name ?? item.album_name ?? `#${item.id}`}
              subtitle={[
                item.academic_year,
                item.role,
                item.grievance_type,
                item.event_type,
                item.event_date,
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

      {/* ── Councils modal ── */}
      {activeTab === 'councils' && (
        <FormModal visible={councils.showModal} title={councils.editingId ? 'Edit Council' : 'New Council'} onClose={() => councils.setShowModal(false)} onSave={councils.save} saving={councils.saving}>
          <FormField label="Council Name" required>
            <StyledInput value={councils.form.name ?? ''} onChangeText={(v) => councils.setForm((f: any) => ({ ...f, name: v }))} placeholder="e.g. Student Union" />
          </FormField>
          <FormField label="Academic Year">
            <StyledInput value={councils.form.academic_year ?? ''} onChangeText={(v) => councils.setForm((f: any) => ({ ...f, academic_year: v }))} placeholder="2024–25" />
          </FormField>
          <FormField label="Description">
            <StyledInput value={councils.form.description ?? ''} onChangeText={(v) => councils.setForm((f: any) => ({ ...f, description: v }))} multiline />
          </FormField>
        </FormModal>
      )}

      {/* ── Members modal ── */}
      {activeTab === 'members' && (
        <FormModal visible={members.showModal} title={members.editingId ? 'Edit Member' : 'Add Member'} onClose={() => members.setShowModal(false)} onSave={members.save} saving={members.saving}>
          <FormField label="Role" required>
            <StyledInput value={members.form.role ?? ''} onChangeText={(v) => members.setForm((f: any) => ({ ...f, role: v }))} placeholder="e.g. President, Secretary" />
          </FormField>
          <FormField label="Start Date">
            <StyledInput value={members.form.start_date ?? ''} onChangeText={(v) => members.setForm((f: any) => ({ ...f, start_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="End Date">
            <StyledInput value={members.form.end_date ?? ''} onChangeText={(v) => members.setForm((f: any) => ({ ...f, end_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
        </FormModal>
      )}

      {/* ── Grievances modal ── */}
      {activeTab === 'grievances' && (
        <FormModal visible={grievances.showModal} title={grievances.editingId ? 'Edit Grievance' : 'New Grievance'} onClose={() => grievances.setShowModal(false)} onSave={grievances.save} saving={grievances.saving}>
          <FormField label="Title" required>
            <StyledInput value={grievances.form.title ?? ''} onChangeText={(v) => grievances.setForm((f: any) => ({ ...f, title: v }))} placeholder="Brief title" />
          </FormField>
          <FormField label="Type">
            <SimpleSelect options={GRIEVANCE_TYPES} value={grievances.form.grievance_type ?? 'academic'} onChange={(v) => grievances.setForm((f: any) => ({ ...f, grievance_type: v }))} />
          </FormField>
          <FormField label="Description" required>
            <StyledInput value={grievances.form.description ?? ''} onChangeText={(v) => grievances.setForm((f: any) => ({ ...f, description: v }))} multiline numberOfLines={4} />
          </FormField>
          {isAdmin && (
            <FormField label="Status">
              <SimpleSelect options={GRIEVANCE_STATUSES} value={grievances.form.status ?? 'open'} onChange={(v) => grievances.setForm((f: any) => ({ ...f, status: v }))} />
            </FormField>
          )}
        </FormModal>
      )}

      {/* ── Events modal ── */}
      {activeTab === 'events' && (
        <FormModal visible={events.showModal} title={events.editingId ? 'Edit Event' : 'New Event'} onClose={() => events.setShowModal(false)} onSave={events.save} saving={events.saving}>
          <FormField label="Event Name" required>
            <StyledInput value={events.form.name ?? ''} onChangeText={(v) => events.setForm((f: any) => ({ ...f, name: v }))} placeholder="Event name" />
          </FormField>
          <FormField label="Event Type">
            <SimpleSelect options={EVENT_TYPES} value={events.form.event_type ?? 'academic'} onChange={(v) => events.setForm((f: any) => ({ ...f, event_type: v }))} />
          </FormField>
          <FormField label="Event Date" required>
            <StyledInput value={events.form.event_date ?? ''} onChangeText={(v) => events.setForm((f: any) => ({ ...f, event_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Venue">
            <StyledInput value={events.form.venue ?? ''} onChangeText={(v) => events.setForm((f: any) => ({ ...f, venue: v }))} />
          </FormField>
          <FormField label="Description">
            <StyledInput value={events.form.description ?? ''} onChangeText={(v) => events.setForm((f: any) => ({ ...f, description: v }))} multiline />
          </FormField>
        </FormModal>
      )}

      {/* ── Gallery modal ── */}
      {activeTab === 'gallery' && (
        <FormModal visible={gallery.showModal} title={gallery.editingId ? 'Edit Album' : 'New Album'} onClose={() => gallery.setShowModal(false)} onSave={gallery.save} saving={gallery.saving}>
          <FormField label="Album Name" required>
            <StyledInput value={gallery.form.name ?? ''} onChangeText={(v) => gallery.setForm((f: any) => ({ ...f, name: v }))} placeholder="Album name" />
          </FormField>
          <FormField label="Description">
            <StyledInput value={gallery.form.description ?? ''} onChangeText={(v) => gallery.setForm((f: any) => ({ ...f, description: v }))} multiline />
          </FormField>
        </FormModal>
      )}
    </View>
  );
}
