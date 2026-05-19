/**
 * Forms Screen (Form Builder)
 * Sub-tabs: Templates | Responses
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Alert, RefreshControl } from 'react-native';
import {
  formTemplatesApi,
  formResponsesApi,
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

const TEMPLATE_TYPES = ['admission', 'feedback', 'survey', 'application', 'registration', 'other'].map((t) => ({ label: t, value: t }));

const TABS = [
  { key: 'templates', label: 'Templates' },
  { key: 'responses', label: 'Responses' },
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

export default function FormsScreen() {
  const { schoolId, isAdmin } = useErpRole();
  const [activeTab, setActiveTab] = useState('templates');
  const baseParams = schoolId ? { school_id: schoolId } : {};

  const templates = useCrud(formTemplatesApi, baseParams);
  const responses = useCrud(formResponsesApi, baseParams);

  useEffect(() => {
    if (activeTab === 'templates') templates.load(1);
    else if (activeTab === 'responses') responses.load(1);
  }, [activeTab]);

  const section = activeTab === 'templates' ? templates : responses;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.gray[50] }}>
      <SubTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <SearchBar value={section.search} onChangeText={section.setSearch} />

      <ScrollView
        refreshControl={<RefreshControl refreshing={section.refreshing} onRefresh={() => { section.setRefreshing(true); section.load(section.page); }} />}
      >
        <SectionHeader
          title={`${section.total} Records`}
          onAdd={isAdmin && activeTab === 'templates' ? section.openAdd : undefined}
        />
        {section.loading ? <LoadingState /> : section.items.length === 0 ? <EmptyState /> : (
          section.items.map((item: any) => (
            <ListRow
              key={item.id}
              title={item.name ?? item.title ?? `#${item.id}`}
              subtitle={[item.form_type, item.description].filter(Boolean).join(' · ')}
              rightComponent={item.is_active !== undefined ? <StatusBadge status={item.is_active ? 'active' : 'inactive'} /> : undefined}
              onEdit={isAdmin && activeTab === 'templates' ? () => section.openEdit(item) : undefined}
              onDelete={isAdmin && activeTab === 'templates' ? () => section.remove(item.id) : undefined}
            />
          ))
        )}
        <Pagination page={section.page} total={section.total} perPage={PER_PAGE} onPrev={() => section.load(section.page - 1)} onNext={() => section.load(section.page + 1)} />
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Template modal ── */}
      {activeTab === 'templates' && (
        <FormModal visible={templates.showModal} title={templates.editingId ? 'Edit Template' : 'New Template'} onClose={() => templates.setShowModal(false)} onSave={templates.save} saving={templates.saving}>
          <FormField label="Form Name" required>
            <StyledInput value={templates.form.name ?? ''} onChangeText={(v) => templates.setForm((f: any) => ({ ...f, name: v }))} placeholder="e.g. Admission Form 2024" />
          </FormField>
          <FormField label="Form Type">
            <SimpleSelect options={TEMPLATE_TYPES} value={templates.form.form_type ?? 'other'} onChange={(v) => templates.setForm((f: any) => ({ ...f, form_type: v }))} />
          </FormField>
          <FormField label="Description">
            <StyledInput value={templates.form.description ?? ''} onChangeText={(v) => templates.setForm((f: any) => ({ ...f, description: v }))} multiline numberOfLines={3} placeholder="Form description" />
          </FormField>
        </FormModal>
      )}
    </View>
  );
}
