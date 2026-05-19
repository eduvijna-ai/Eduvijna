/**
 * Biometric Screen
 * Sub-tabs: Devices | Enrollments | Logs
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Alert, RefreshControl } from 'react-native';
import {
  biometricDevicesApi,
  biometricEnrollmentsApi,
  biometricLogsApi,
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

const DEVICE_TYPES = ['fingerprint', 'face', 'iris', 'card', 'pin', 'hybrid'].map((t) => ({ label: t, value: t }));

const TABS = [
  { key: 'devices', label: 'Devices' },
  { key: 'enrollments', label: 'Enrollments' },
  { key: 'logs', label: 'Logs' },
];

const PER_PAGE = 25;

function useCrud(apiModule: any, baseParams: Record<string, any>, readOnly = false) {
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
    if (readOnly) return;
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
    if (readOnly) return;
    try { await apiModule.softDelete(id); load(page); }
    catch { Alert.alert('Error', 'Delete failed.'); }
  };

  return { items, total, page, search, setSearch, loading, refreshing, setRefreshing,
    showModal, setShowModal, saving, form, setForm, editingId,
    load, openAdd, openEdit, save, remove };
}

export default function BiometricScreen() {
  const { schoolId, isAdmin } = useErpRole();
  const [activeTab, setActiveTab] = useState('devices');
  const baseParams = schoolId ? { school_id: schoolId } : {};

  const devices = useCrud(biometricDevicesApi, baseParams);
  const enrollments = useCrud(biometricEnrollmentsApi, baseParams);
  const logs = useCrud(biometricLogsApi, baseParams, true);

  useEffect(() => {
    if (activeTab === 'devices') devices.load(1);
    else if (activeTab === 'enrollments') enrollments.load(1);
    else if (activeTab === 'logs') logs.load(1);
  }, [activeTab]);

  const section =
    activeTab === 'devices' ? devices :
    activeTab === 'enrollments' ? enrollments : logs;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.gray[50] }}>
      <SubTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <SearchBar value={section.search} onChangeText={section.setSearch} />

      <ScrollView
        refreshControl={<RefreshControl refreshing={section.refreshing} onRefresh={() => { section.setRefreshing(true); section.load(section.page); }} />}
      >
        <SectionHeader
          title={`${section.total} Records`}
          onAdd={isAdmin && activeTab !== 'logs' ? section.openAdd : undefined}
        />
        {section.loading ? <LoadingState /> : section.items.length === 0 ? <EmptyState /> : (
          section.items.map((item: any) => (
            <ListRow
              key={item.id}
              title={item.device_name ?? item.name ?? item.staff_name ?? item.student_name ?? `#${item.id}`}
              subtitle={[
                item.device_type,
                item.location,
                item.log_time ?? item.timestamp,
                item.action,
              ].filter(Boolean).join(' · ')}
              rightComponent={item.is_active !== undefined ? <StatusBadge status={item.is_active ? 'active' : 'inactive'} /> : undefined}
              onEdit={isAdmin && activeTab !== 'logs' ? () => section.openEdit(item) : undefined}
              onDelete={isAdmin && activeTab !== 'logs' ? () => section.remove(item.id) : undefined}
            />
          ))
        )}
        <Pagination page={section.page} total={section.total} perPage={PER_PAGE} onPrev={() => section.load(section.page - 1)} onNext={() => section.load(section.page + 1)} />
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Devices modal ── */}
      {activeTab === 'devices' && (
        <FormModal visible={devices.showModal} title={devices.editingId ? 'Edit Device' : 'New Device'} onClose={() => devices.setShowModal(false)} onSave={devices.save} saving={devices.saving}>
          <FormField label="Device Name" required>
            <StyledInput value={devices.form.device_name ?? ''} onChangeText={(v) => devices.setForm((f: any) => ({ ...f, device_name: v }))} placeholder="e.g. Main Gate Scanner" />
          </FormField>
          <FormField label="Device Type">
            <SimpleSelect options={DEVICE_TYPES} value={devices.form.device_type ?? 'fingerprint'} onChange={(v) => devices.setForm((f: any) => ({ ...f, device_type: v }))} />
          </FormField>
          <FormField label="Location">
            <StyledInput value={devices.form.location ?? ''} onChangeText={(v) => devices.setForm((f: any) => ({ ...f, location: v }))} placeholder="Building / Gate / Room" />
          </FormField>
          <FormField label="IP Address">
            <StyledInput value={devices.form.ip_address ?? ''} onChangeText={(v) => devices.setForm((f: any) => ({ ...f, ip_address: v }))} placeholder="192.168.x.x" keyboardType="decimal-pad" />
          </FormField>
        </FormModal>
      )}

      {/* ── Enrollments modal ── */}
      {activeTab === 'enrollments' && (
        <FormModal visible={enrollments.showModal} title={enrollments.editingId ? 'Edit Enrollment' : 'New Enrollment'} onClose={() => enrollments.setShowModal(false)} onSave={enrollments.save} saving={enrollments.saving}>
          <FormField label="User Type" required>
            <SimpleSelect options={[{ label: 'Staff', value: 'staff' }, { label: 'Student', value: 'student' }]} value={enrollments.form.user_type ?? 'staff'} onChange={(v) => enrollments.setForm((f: any) => ({ ...f, user_type: v }))} />
          </FormField>
          <FormField label="User ID" required>
            <StyledInput value={String(enrollments.form.user_id ?? '')} onChangeText={(v) => enrollments.setForm((f: any) => ({ ...f, user_id: v }))} keyboardType="numeric" placeholder="Staff / Student ID" />
          </FormField>
          <FormField label="Device ID" required>
            <StyledInput value={String(enrollments.form.device_id ?? '')} onChangeText={(v) => enrollments.setForm((f: any) => ({ ...f, device_id: v }))} keyboardType="numeric" placeholder="Device ID" />
          </FormField>
        </FormModal>
      )}
    </View>
  );
}
