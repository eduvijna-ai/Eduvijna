/**
 * Analytics Screen
 * Sub-tabs: Report Templates | Snapshots | Widgets
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Alert, RefreshControl } from 'react-native';
import {
  reportTemplatesApi,
  reportSnapshotsApi,
  dashboardWidgetsApi,
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

const REPORT_TYPES = ['attendance', 'fees', 'academics', 'hr', 'admissions', 'custom'].map((t) => ({ label: t, value: t }));
const WIDGET_TYPES = ['bar_chart', 'line_chart', 'pie_chart', 'kpi_card', 'table', 'calendar'].map((t) => ({ label: t, value: t }));

const TABS = [
  { key: 'templates', label: 'Templates' },
  { key: 'snapshots', label: 'Snapshots' },
  { key: 'widgets', label: 'Widgets' },
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

export default function AnalyticsScreen() {
  const { schoolId, isAdmin } = useErpRole();
  const [activeTab, setActiveTab] = useState('templates');
  const baseParams = schoolId ? { school_id: schoolId } : {};

  const templates = useCrud(reportTemplatesApi, baseParams);
  const snapshots = useCrud(reportSnapshotsApi, baseParams);
  const widgets = useCrud(dashboardWidgetsApi, baseParams);

  useEffect(() => {
    if (activeTab === 'templates') templates.load(1);
    else if (activeTab === 'snapshots') snapshots.load(1);
    else if (activeTab === 'widgets') widgets.load(1);
  }, [activeTab]);

  const section =
    activeTab === 'templates' ? templates :
    activeTab === 'snapshots' ? snapshots : widgets;

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
              title={item.name ?? item.title ?? `#${item.id}`}
              subtitle={[item.report_type ?? item.widget_type, item.description, item.created_at].filter(Boolean).join(' · ')}
              rightComponent={item.is_active !== undefined ? <StatusBadge status={item.is_active ? 'active' : 'inactive'} /> : undefined}
              onEdit={isAdmin ? () => section.openEdit(item) : undefined}
              onDelete={isAdmin ? () => section.remove(item.id) : undefined}
            />
          ))
        )}
        <Pagination page={section.page} total={section.total} perPage={PER_PAGE} onPrev={() => section.load(section.page - 1)} onNext={() => section.load(section.page + 1)} />
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Report Template modal ── */}
      {activeTab === 'templates' && (
        <FormModal visible={templates.showModal} title={templates.editingId ? 'Edit Template' : 'New Template'} onClose={() => templates.setShowModal(false)} onSave={templates.save} saving={templates.saving}>
          <FormField label="Template Name" required>
            <StyledInput value={templates.form.name ?? ''} onChangeText={(v) => templates.setForm((f: any) => ({ ...f, name: v }))} placeholder="e.g. Monthly Attendance Report" />
          </FormField>
          <FormField label="Report Type">
            <SimpleSelect options={REPORT_TYPES} value={templates.form.report_type ?? 'custom'} onChange={(v) => templates.setForm((f: any) => ({ ...f, report_type: v }))} />
          </FormField>
          <FormField label="Description">
            <StyledInput value={templates.form.description ?? ''} onChangeText={(v) => templates.setForm((f: any) => ({ ...f, description: v }))} multiline numberOfLines={3} />
          </FormField>
        </FormModal>
      )}

      {/* ── Widget modal ── */}
      {activeTab === 'widgets' && (
        <FormModal visible={widgets.showModal} title={widgets.editingId ? 'Edit Widget' : 'New Widget'} onClose={() => widgets.setShowModal(false)} onSave={widgets.save} saving={widgets.saving}>
          <FormField label="Widget Name" required>
            <StyledInput value={widgets.form.name ?? ''} onChangeText={(v) => widgets.setForm((f: any) => ({ ...f, name: v }))} placeholder="e.g. Fee Collection Chart" />
          </FormField>
          <FormField label="Widget Type">
            <SimpleSelect options={WIDGET_TYPES} value={widgets.form.widget_type ?? 'kpi_card'} onChange={(v) => widgets.setForm((f: any) => ({ ...f, widget_type: v }))} />
          </FormField>
          <FormField label="Data Source">
            <StyledInput value={widgets.form.data_source ?? ''} onChangeText={(v) => widgets.setForm((f: any) => ({ ...f, data_source: v }))} placeholder="API endpoint or table name" />
          </FormField>
          <FormField label="Position">
            <StyledInput value={String(widgets.form.position ?? '')} onChangeText={(v) => widgets.setForm((f: any) => ({ ...f, position: v }))} keyboardType="numeric" placeholder="1" />
          </FormField>
        </FormModal>
      )}
    </View>
  );
}
