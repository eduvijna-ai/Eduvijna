/**
 * Academic Setup Screen
 * Sub-tabs: Courses | Batches | Terms
 * Admin only.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Alert, ScrollView, RefreshControl } from 'react-native';
import { coursesApi, batchesApi, academicTermsApi } from '../../core/api/erp.api';
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
} from '../components/common';
import { useErpRole } from '../hooks/useErpRole';
import { useAcademicYear } from '../contexts/AcademicYearContext';

const TABS = [
  { key: 'courses', label: 'Courses' },
  { key: 'batches', label: 'Batches' },
  { key: 'terms', label: 'Terms' },
];

const PER_PAGE = 25;

function useCrud<T = any>(
  api: { list: (p: any) => Promise<any>; create: (d: any) => Promise<any>; update: (id: any, d: any) => Promise<any>; softDelete: (id: any) => Promise<any> },
  extraParams?: Record<string, any>,
) {
  const [items, setItems] = useState<T[]>([]);
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
      const data = await api.list({ page: p, per_page: PER_PAGE, q: search || undefined, ...extraParams });
      setItems(data?.items ?? data ?? []);
      setTotal(data?.total ?? (data?.items?.length ?? 0));
      setPage(p);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, JSON.stringify(extraParams)]);

  useEffect(() => {
    const t = setTimeout(() => load(1), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { load(1); }, [JSON.stringify(extraParams)]);

  const openAdd = () => { setEditingId(null); setForm({}); setShowModal(true); };
  const openEdit = (item: any) => { setEditingId(item.id); setForm({ ...item }); setShowModal(true); };

  const save = async () => {
    setSaving(true);
    try {
      if (editingId) await api.update(editingId, form);
      else await api.create(form);
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
      await api.softDelete(id);
      load(page);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail ?? 'Delete failed.');
    }
  };

  return { items, total, page, search, setSearch, loading, refreshing, setRefreshing,
    showModal, setShowModal, saving, form, setForm, editingId,
    load, openAdd, openEdit, save, remove };
}

export default function AcademicSetupScreen() {
  const { schoolId, isAdmin } = useErpRole();
  const { selectedYearId } = useAcademicYear();
  const [activeTab, setActiveTab] = useState('courses');
  const baseParams = {
    ...(schoolId ? { school_id: schoolId } : {}),
    ...(selectedYearId ? { academic_year_id: selectedYearId } : {}),
  };

  const courses = useCrud(coursesApi, baseParams);
  const batches = useCrud(batchesApi, baseParams);
  const terms = useCrud(academicTermsApi, baseParams);

  const current = activeTab === 'courses' ? courses : activeTab === 'batches' ? batches : terms;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.gray[50] }}>
      <SubTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <SearchBar value={current.search} onChangeText={current.setSearch} />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={current.refreshing}
            onRefresh={() => { current.setRefreshing(true); current.load(current.page); }}
          />
        }
      >
        <SectionHeader
          title={`${current.total} ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
          onAdd={isAdmin ? current.openAdd : undefined}
        />
        {current.loading ? (
          <LoadingState />
        ) : current.items.length === 0 ? (
          <EmptyState />
        ) : (
          current.items.map((item: any) => (
            <ListRow
              key={item.id}
              title={item.name}
              subtitle={item.code ?? item.description ?? item.batch_name ?? ''}
              onEdit={isAdmin ? () => current.openEdit(item) : undefined}
              onDelete={isAdmin ? () => current.remove(item.id) : undefined}
            />
          ))
        )}
        <Pagination
          page={current.page}
          total={current.total}
          perPage={PER_PAGE}
          onPrev={() => current.load(current.page - 1)}
          onNext={() => current.load(current.page + 1)}
        />
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Courses modal ── */}
      {activeTab === 'courses' && (
        <FormModal
          visible={courses.showModal}
          title={courses.editingId ? 'Edit Course' : 'New Course'}
          onClose={() => courses.setShowModal(false)}
          onSave={courses.save}
          saving={courses.saving}
        >
          <FormField label="Name" required>
            <StyledInput value={courses.form.name ?? ''} onChangeText={(v) => courses.setForm((f: any) => ({ ...f, name: v }))} placeholder="Course name" />
          </FormField>
          <FormField label="Code">
            <StyledInput value={courses.form.code ?? ''} onChangeText={(v) => courses.setForm((f: any) => ({ ...f, code: v }))} placeholder="Course code" />
          </FormField>
          <FormField label="Description">
            <StyledInput value={courses.form.description ?? ''} onChangeText={(v) => courses.setForm((f: any) => ({ ...f, description: v }))} placeholder="Description" multiline numberOfLines={3} />
          </FormField>
          <FormField label="Credit Hours">
            <StyledInput value={String(courses.form.credit_hours ?? '')} onChangeText={(v) => courses.setForm((f: any) => ({ ...f, credit_hours: v }))} keyboardType="numeric" placeholder="0" />
          </FormField>
        </FormModal>
      )}

      {/* ── Batches modal ── */}
      {activeTab === 'batches' && (
        <FormModal
          visible={batches.showModal}
          title={batches.editingId ? 'Edit Batch' : 'New Batch'}
          onClose={() => batches.setShowModal(false)}
          onSave={batches.save}
          saving={batches.saving}
        >
          <FormField label="Name" required>
            <StyledInput value={batches.form.name ?? ''} onChangeText={(v) => batches.setForm((f: any) => ({ ...f, name: v }))} placeholder="Batch name" />
          </FormField>
          <FormField label="Max Students">
            <StyledInput value={String(batches.form.max_students ?? '')} onChangeText={(v) => batches.setForm((f: any) => ({ ...f, max_students: v }))} keyboardType="numeric" placeholder="40" />
          </FormField>
          <FormField label="Start Date">
            <StyledInput value={batches.form.start_date ?? ''} onChangeText={(v) => batches.setForm((f: any) => ({ ...f, start_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="End Date">
            <StyledInput value={batches.form.end_date ?? ''} onChangeText={(v) => batches.setForm((f: any) => ({ ...f, end_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
        </FormModal>
      )}

      {/* ── Terms modal ── */}
      {activeTab === 'terms' && (
        <FormModal
          visible={terms.showModal}
          title={terms.editingId ? 'Edit Term' : 'New Term'}
          onClose={() => terms.setShowModal(false)}
          onSave={terms.save}
          saving={terms.saving}
        >
          <FormField label="Name" required>
            <StyledInput value={terms.form.name ?? ''} onChangeText={(v) => terms.setForm((f: any) => ({ ...f, name: v }))} placeholder="Term name" />
          </FormField>
          <FormField label="Start Date" required>
            <StyledInput value={terms.form.start_date ?? ''} onChangeText={(v) => terms.setForm((f: any) => ({ ...f, start_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="End Date" required>
            <StyledInput value={terms.form.end_date ?? ''} onChangeText={(v) => terms.setForm((f: any) => ({ ...f, end_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
        </FormModal>
      )}
    </View>
  );
}
