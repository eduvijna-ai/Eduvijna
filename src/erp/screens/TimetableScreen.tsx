/**
 * Timetable Screen
 * Sub-tabs: Templates | Slots
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Alert, RefreshControl } from 'react-native';
import { timetableTemplatesApi, timetableSlotsApi } from '../../core/api/erp.api';
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
} from '../components/common';
import { useErpRole } from '../hooks/useErpRole';
import { useAcademicYear } from '../contexts/AcademicYearContext';

const DAYS = [
  { label: 'Sunday', value: '0' },
  { label: 'Monday', value: '1' },
  { label: 'Tuesday', value: '2' },
  { label: 'Wednesday', value: '3' },
  { label: 'Thursday', value: '4' },
  { label: 'Friday', value: '5' },
  { label: 'Saturday', value: '6' },
];

const SLOT_TYPES = ['lecture', 'lab', 'tutorial', 'break', 'assembly', 'library', 'sports', 'free'].map((t) => ({ label: t, value: t }));

const TABS = [
  { key: 'templates', label: 'Templates' },
  { key: 'slots', label: 'Slots' },
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

export default function TimetableScreen() {
  const { schoolId, isAdmin } = useErpRole();
  const { selectedYearId } = useAcademicYear();
  const [activeTab, setActiveTab] = useState('templates');
  const baseParams = {
    ...(schoolId ? { school_id: schoolId } : {}),
    ...(selectedYearId ? { academic_year_id: selectedYearId } : {}),
  };

  const templates = useCrud(timetableTemplatesApi, baseParams);
  const slots = useCrud(timetableSlotsApi, baseParams);

  useEffect(() => {
    if (activeTab === 'templates') templates.load(1);
    else slots.load(1);
  }, [activeTab]);

  const section = activeTab === 'templates' ? templates : slots;

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
        {section.loading ? <LoadingState /> : section.items.length === 0 ? <EmptyState /> : (
          section.items.map((item: any) => (
            <ListRow
              key={item.id}
              title={item.name ?? `${DAYS.find((d) => d.value === String(item.day_of_week))?.label ?? ''} P${item.period_number}`}
              subtitle={[item.slot_type, item.start_time, item.end_time, item.room].filter(Boolean).join(' · ')}
              onEdit={isAdmin ? () => section.openEdit(item) : undefined}
              onDelete={isAdmin ? () => section.remove(item.id) : undefined}
            />
          ))
        )}
        <Pagination page={section.page} total={section.total} perPage={PER_PAGE} onPrev={() => section.load(section.page - 1)} onNext={() => section.load(section.page + 1)} />
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Template modal ── */}
      {activeTab === 'templates' && (
        <FormModal visible={templates.showModal} title={templates.editingId ? 'Edit Template' : 'New Template'} onClose={() => templates.setShowModal(false)} onSave={templates.save} saving={templates.saving}>
          <FormField label="Template Name" required>
            <StyledInput value={templates.form.name ?? ''} onChangeText={(v) => templates.setForm((f: any) => ({ ...f, name: v }))} placeholder="e.g. Class 10A Schedule" />
          </FormField>
          <FormField label="Effective From">
            <StyledInput value={templates.form.effective_from ?? ''} onChangeText={(v) => templates.setForm((f: any) => ({ ...f, effective_from: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Effective To">
            <StyledInput value={templates.form.effective_to ?? ''} onChangeText={(v) => templates.setForm((f: any) => ({ ...f, effective_to: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
        </FormModal>
      )}

      {/* ── Slot modal ── */}
      {activeTab === 'slots' && (
        <FormModal visible={slots.showModal} title={slots.editingId ? 'Edit Slot' : 'New Slot'} onClose={() => slots.setShowModal(false)} onSave={slots.save} saving={slots.saving}>
          <FormField label="Day of Week" required>
            <SimpleSelect options={DAYS} value={String(slots.form.day_of_week ?? '1')} onChange={(v) => slots.setForm((f: any) => ({ ...f, day_of_week: Number(v) }))} />
          </FormField>
          <FormField label="Period Number" required>
            <StyledInput value={String(slots.form.period_number ?? '')} onChangeText={(v) => slots.setForm((f: any) => ({ ...f, period_number: v }))} keyboardType="numeric" placeholder="1" />
          </FormField>
          <FormField label="Slot Type">
            <SimpleSelect options={SLOT_TYPES} value={slots.form.slot_type ?? 'lecture'} onChange={(v) => slots.setForm((f: any) => ({ ...f, slot_type: v }))} />
          </FormField>
          <FormField label="Start Time">
            <StyledInput value={slots.form.start_time ?? ''} onChangeText={(v) => slots.setForm((f: any) => ({ ...f, start_time: v }))} placeholder="HH:MM" />
          </FormField>
          <FormField label="End Time">
            <StyledInput value={slots.form.end_time ?? ''} onChangeText={(v) => slots.setForm((f: any) => ({ ...f, end_time: v }))} placeholder="HH:MM" />
          </FormField>
          <FormField label="Room / Location">
            <StyledInput value={slots.form.room ?? ''} onChangeText={(v) => slots.setForm((f: any) => ({ ...f, room: v }))} placeholder="Room 101" />
          </FormField>
        </FormModal>
      )}
    </View>
  );
}
