/**
 * Safety Screen
 * Visitors log (security/safety perspective)
 * Sub-tabs: Visitors | Incidents
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Alert, RefreshControl } from 'react-native';
import { visitorsApi, incidentsApi } from '../../core/api/erp.api';
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

const INCIDENT_TYPES = ['injury', 'fire', 'theft', 'vandalism', 'harassment', 'medical', 'other'].map((t) => ({ label: t, value: t }));
const SEVERITIES = ['low', 'medium', 'high', 'critical'].map((s) => ({ label: s, value: s }));
const INCIDENT_STATUSES = ['open', 'investigating', 'resolved', 'closed'].map((s) => ({ label: s, value: s }));

const TABS = [
  { key: 'visitors', label: 'Visitors' },
  { key: 'incidents', label: 'Incidents' },
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

export default function SafetyScreen() {
  const { schoolId, isAdmin } = useErpRole();
  const [activeTab, setActiveTab] = useState('visitors');
  const baseParams = schoolId ? { school_id: schoolId } : {};

  const visitors = useCrud(visitorsApi, baseParams);
  const incidents = useCrud(incidentsApi, baseParams);

  useEffect(() => {
    if (activeTab === 'visitors') visitors.load(1);
    else incidents.load(1);
  }, [activeTab]);

  const section = activeTab === 'visitors' ? visitors : incidents;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.gray[50] }}>
      <SubTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <SearchBar value={section.search} onChangeText={section.setSearch} />

      <ScrollView
        refreshControl={<RefreshControl refreshing={section.refreshing} onRefresh={() => { section.setRefreshing(true); section.load(section.page); }} />}
      >
        <SectionHeader title={`${section.total} Records`} onAdd={section.openAdd} />
        {section.loading ? <LoadingState /> : section.items.length === 0 ? <EmptyState /> : (
          section.items.map((item: any) => (
            <ListRow
              key={item.id}
              title={item.visitor_name ?? item.title ?? `#${item.id}`}
              subtitle={
                activeTab === 'visitors'
                  ? [item.purpose, item.meeting_with, item.in_time].filter(Boolean).join(' · ')
                  : [item.incident_type, item.severity, item.incident_date].filter(Boolean).join(' · ')
              }
              rightComponent={item.status ? <StatusBadge status={item.status} /> : undefined}
              onEdit={isAdmin ? () => section.openEdit(item) : undefined}
              onDelete={isAdmin ? () => section.remove(item.id) : undefined}
            />
          ))
        )}
        <Pagination page={section.page} total={section.total} perPage={PER_PAGE} onPrev={() => section.load(section.page - 1)} onNext={() => section.load(section.page + 1)} />
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Visitor modal ── */}
      {activeTab === 'visitors' && (
        <FormModal visible={visitors.showModal} title={visitors.editingId ? 'Edit Visitor' : 'Log Visitor'} onClose={() => visitors.setShowModal(false)} onSave={visitors.save} saving={visitors.saving}>
          <FormField label="Visitor Name" required>
            <StyledInput value={visitors.form.visitor_name ?? ''} onChangeText={(v) => visitors.setForm((f: any) => ({ ...f, visitor_name: v }))} placeholder="Full name" />
          </FormField>
          <FormField label="Phone" required>
            <StyledInput value={visitors.form.phone ?? ''} onChangeText={(v) => visitors.setForm((f: any) => ({ ...f, phone: v }))} keyboardType="phone-pad" />
          </FormField>
          <FormField label="Purpose">
            <StyledInput value={visitors.form.purpose ?? ''} onChangeText={(v) => visitors.setForm((f: any) => ({ ...f, purpose: v }))} placeholder="Reason for visit" />
          </FormField>
          <FormField label="Meeting With">
            <StyledInput value={visitors.form.meeting_with ?? ''} onChangeText={(v) => visitors.setForm((f: any) => ({ ...f, meeting_with: v }))} placeholder="Teacher / Staff name" />
          </FormField>
          <FormField label="In Time">
            <StyledInput value={visitors.form.in_time ?? ''} onChangeText={(v) => visitors.setForm((f: any) => ({ ...f, in_time: v }))} placeholder="HH:MM" />
          </FormField>
          <FormField label="Out Time">
            <StyledInput value={visitors.form.out_time ?? ''} onChangeText={(v) => visitors.setForm((f: any) => ({ ...f, out_time: v }))} placeholder="HH:MM" />
          </FormField>
          <FormField label="Badge / ID Number">
            <StyledInput value={visitors.form.badge_number ?? ''} onChangeText={(v) => visitors.setForm((f: any) => ({ ...f, badge_number: v }))} />
          </FormField>
          <FormField label="Vehicle Number">
            <StyledInput value={visitors.form.vehicle_number ?? ''} onChangeText={(v) => visitors.setForm((f: any) => ({ ...f, vehicle_number: v }))} />
          </FormField>
        </FormModal>
      )}

      {/* ── Incident modal ── */}
      {activeTab === 'incidents' && (
        <FormModal visible={incidents.showModal} title={incidents.editingId ? 'Edit Incident' : 'Report Incident'} onClose={() => incidents.setShowModal(false)} onSave={incidents.save} saving={incidents.saving}>
          <FormField label="Title" required>
            <StyledInput value={incidents.form.title ?? ''} onChangeText={(v) => incidents.setForm((f: any) => ({ ...f, title: v }))} placeholder="Brief incident title" />
          </FormField>
          <FormField label="Incident Type" required>
            <SimpleSelect options={INCIDENT_TYPES} value={incidents.form.incident_type ?? 'other'} onChange={(v) => incidents.setForm((f: any) => ({ ...f, incident_type: v }))} />
          </FormField>
          <FormField label="Severity">
            <SimpleSelect options={SEVERITIES} value={incidents.form.severity ?? 'low'} onChange={(v) => incidents.setForm((f: any) => ({ ...f, severity: v }))} />
          </FormField>
          <FormField label="Incident Date" required>
            <StyledInput value={incidents.form.incident_date ?? ''} onChangeText={(v) => incidents.setForm((f: any) => ({ ...f, incident_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Description">
            <StyledInput value={incidents.form.description ?? ''} onChangeText={(v) => incidents.setForm((f: any) => ({ ...f, description: v }))} multiline numberOfLines={4} />
          </FormField>
          {isAdmin && (
            <FormField label="Status">
              <SimpleSelect options={INCIDENT_STATUSES} value={incidents.form.status ?? 'open'} onChange={(v) => incidents.setForm((f: any) => ({ ...f, status: v }))} />
            </FormField>
          )}
        </FormModal>
      )}
    </View>
  );
}
