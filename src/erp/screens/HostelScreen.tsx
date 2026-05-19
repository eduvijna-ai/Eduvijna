/**
 * Hostel Screen
 * Sub-tabs: Rooms | Allocations | Complaints
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Alert, RefreshControl } from 'react-native';
import { hostelRoomsApi, hostelAllocationsApi, hostelComplaintsApi } from '../../core/api/erp.api';
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

const ROOM_TYPES = ['single', 'double', 'triple', 'dormitory'].map((t) => ({ label: t, value: t }));
const ROOM_STATUSES = ['available', 'full', 'maintenance'].map((s) => ({ label: s, value: s }));
const COMPLAINT_STATUSES = ['open', 'in_progress', 'resolved', 'closed'].map((s) => ({ label: s, value: s }));
const COMPLAINT_TYPES = ['maintenance', 'cleanliness', 'food', 'security', 'other'].map((t) => ({ label: t, value: t }));

const TABS = [
  { key: 'rooms', label: 'Rooms' },
  { key: 'allocations', label: 'Allocations' },
  { key: 'complaints', label: 'Complaints' },
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

export default function HostelScreen() {
  const { schoolId, isAdmin } = useErpRole();
  const [activeTab, setActiveTab] = useState('rooms');
  const baseParams = schoolId ? { school_id: schoolId } : {};

  const rooms = useCrud(hostelRoomsApi, baseParams);
  const allocations = useCrud(hostelAllocationsApi, baseParams);
  const complaints = useCrud(hostelComplaintsApi, baseParams);

  useEffect(() => {
    if (activeTab === 'rooms') rooms.load(1);
    else if (activeTab === 'allocations') allocations.load(1);
    else complaints.load(1);
  }, [activeTab]);

  const sectionMap: Record<string, any> = { rooms, allocations, complaints };
  const section = sectionMap[activeTab];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.gray[50] }}>
      <SubTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <SearchBar value={section.search} onChangeText={section.setSearch} />

      <ScrollView
        refreshControl={<RefreshControl refreshing={section.refreshing} onRefresh={() => { section.setRefreshing(true); section.load(section.page); }} />}
      >
        <SectionHeader title={`${section.total} Records`} onAdd={isAdmin ? section.openAdd : activeTab === 'complaints' ? section.openAdd : undefined} />
        {section.loading ? <LoadingState /> : section.items.length === 0 ? <EmptyState /> : (
          section.items.map((item: any) => (
            <ListRow
              key={item.id}
              title={item.room_number ?? item.student_name ?? item.title ?? `#${item.id}`}
              subtitle={[
                item.room_type,
                item.capacity ? `Cap: ${item.capacity}` : '',
                item.allocation_date,
                item.complaint_type,
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

      {/* ── Room modal ── */}
      {activeTab === 'rooms' && (
        <FormModal visible={rooms.showModal} title={rooms.editingId ? 'Edit Room' : 'Add Room'} onClose={() => rooms.setShowModal(false)} onSave={rooms.save} saving={rooms.saving}>
          <FormField label="Room Number" required>
            <StyledInput value={rooms.form.room_number ?? ''} onChangeText={(v) => rooms.setForm((f: any) => ({ ...f, room_number: v }))} placeholder="e.g. A-101" />
          </FormField>
          <FormField label="Room Type">
            <SimpleSelect options={ROOM_TYPES} value={rooms.form.room_type ?? 'double'} onChange={(v) => rooms.setForm((f: any) => ({ ...f, room_type: v }))} />
          </FormField>
          <FormField label="Capacity">
            <StyledInput value={String(rooms.form.capacity ?? '')} onChangeText={(v) => rooms.setForm((f: any) => ({ ...f, capacity: v }))} keyboardType="numeric" />
          </FormField>
          <FormField label="Floor">
            <StyledInput value={String(rooms.form.floor ?? '')} onChangeText={(v) => rooms.setForm((f: any) => ({ ...f, floor: v }))} keyboardType="numeric" />
          </FormField>
          <FormField label="Status">
            <SimpleSelect options={ROOM_STATUSES} value={rooms.form.status ?? 'available'} onChange={(v) => rooms.setForm((f: any) => ({ ...f, status: v }))} />
          </FormField>
        </FormModal>
      )}

      {/* ── Allocation modal ── */}
      {activeTab === 'allocations' && (
        <FormModal visible={allocations.showModal} title={allocations.editingId ? 'Edit Allocation' : 'New Allocation'} onClose={() => allocations.setShowModal(false)} onSave={allocations.save} saving={allocations.saving}>
          <FormField label="Allocation Date" required>
            <StyledInput value={allocations.form.allocation_date ?? ''} onChangeText={(v) => allocations.setForm((f: any) => ({ ...f, allocation_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Vacate Date">
            <StyledInput value={allocations.form.vacate_date ?? ''} onChangeText={(v) => allocations.setForm((f: any) => ({ ...f, vacate_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Monthly Fee">
            <StyledInput value={String(allocations.form.monthly_fee ?? '')} onChangeText={(v) => allocations.setForm((f: any) => ({ ...f, monthly_fee: v }))} keyboardType="numeric" />
          </FormField>
          <FormField label="Remarks">
            <StyledInput value={allocations.form.remarks ?? ''} onChangeText={(v) => allocations.setForm((f: any) => ({ ...f, remarks: v }))} multiline />
          </FormField>
        </FormModal>
      )}

      {/* ── Complaint modal ── */}
      {activeTab === 'complaints' && (
        <FormModal visible={complaints.showModal} title={complaints.editingId ? 'Edit Complaint' : 'New Complaint'} onClose={() => complaints.setShowModal(false)} onSave={complaints.save} saving={complaints.saving}>
          <FormField label="Title" required>
            <StyledInput value={complaints.form.title ?? ''} onChangeText={(v) => complaints.setForm((f: any) => ({ ...f, title: v }))} placeholder="Brief description" />
          </FormField>
          <FormField label="Complaint Type">
            <SimpleSelect options={COMPLAINT_TYPES} value={complaints.form.complaint_type ?? 'maintenance'} onChange={(v) => complaints.setForm((f: any) => ({ ...f, complaint_type: v }))} />
          </FormField>
          <FormField label="Description">
            <StyledInput value={complaints.form.description ?? ''} onChangeText={(v) => complaints.setForm((f: any) => ({ ...f, description: v }))} multiline numberOfLines={3} />
          </FormField>
          {isAdmin && (
            <FormField label="Status">
              <SimpleSelect options={COMPLAINT_STATUSES} value={complaints.form.status ?? 'open'} onChange={(v) => complaints.setForm((f: any) => ({ ...f, status: v }))} />
            </FormField>
          )}
        </FormModal>
      )}
    </View>
  );
}
