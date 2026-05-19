/**
 * Transport Screen
 * Sub-tabs: Vehicles | Routes | Assignments
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Alert, RefreshControl } from 'react-native';
import { vehiclesApi, routesApi, transportAssignmentsApi } from '../../core/api/erp.api';
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

const VEHICLE_STATUSES = ['active', 'maintenance', 'inactive'].map((s) => ({ label: s, value: s }));
const MEMBER_TYPES = [{ label: 'Student', value: 'student' }, { label: 'Staff', value: 'staff' }];

const TABS = [
  { key: 'vehicles', label: 'Vehicles' },
  { key: 'routes', label: 'Routes' },
  { key: 'assignments', label: 'Assignments' },
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

export default function TransportScreen() {
  const { schoolId, isAdmin } = useErpRole();
  const [activeTab, setActiveTab] = useState('vehicles');
  const baseParams = schoolId ? { school_id: schoolId } : {};

  const vehicles = useCrud(vehiclesApi, baseParams);
  const routes = useCrud(routesApi, baseParams);
  const assignments = useCrud(transportAssignmentsApi, baseParams);

  useEffect(() => {
    if (activeTab === 'vehicles') vehicles.load(1);
    else if (activeTab === 'routes') routes.load(1);
    else assignments.load(1);
  }, [activeTab]);

  const sectionMap: Record<string, any> = { vehicles, routes, assignments };
  const section = sectionMap[activeTab];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.gray[50] }}>
      <SubTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <SearchBar value={section.search} onChangeText={section.setSearch} />

      <ScrollView
        refreshControl={<RefreshControl refreshing={section.refreshing} onRefresh={() => { section.setRefreshing(true); section.load(section.page); }} />}
      >
        <SectionHeader title={`${section.total} Records`} onAdd={isAdmin ? section.openAdd : undefined} />
        {section.loading ? <LoadingState /> : section.items.length === 0 ? <EmptyState /> : (
          section.items.map((item: any) => (
            <ListRow
              key={item.id}
              title={item.vehicle_number ?? item.name ?? item.route_name ?? `#${item.id}`}
              subtitle={[
                item.driver_name,
                item.vehicle_type,
                item.capacity ? `Capacity: ${item.capacity}` : '',
                item.member_type,
                item.stop_name,
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

      {/* ── Vehicle modal ── */}
      {activeTab === 'vehicles' && (
        <FormModal visible={vehicles.showModal} title={vehicles.editingId ? 'Edit Vehicle' : 'Add Vehicle'} onClose={() => vehicles.setShowModal(false)} onSave={vehicles.save} saving={vehicles.saving}>
          <FormField label="Vehicle Number" required>
            <StyledInput value={vehicles.form.vehicle_number ?? ''} onChangeText={(v) => vehicles.setForm((f: any) => ({ ...f, vehicle_number: v }))} placeholder="MH 12 AB 1234" />
          </FormField>
          <FormField label="Driver Name">
            <StyledInput value={vehicles.form.driver_name ?? ''} onChangeText={(v) => vehicles.setForm((f: any) => ({ ...f, driver_name: v }))} />
          </FormField>
          <FormField label="Driver Phone">
            <StyledInput value={vehicles.form.driver_phone ?? ''} onChangeText={(v) => vehicles.setForm((f: any) => ({ ...f, driver_phone: v }))} keyboardType="phone-pad" />
          </FormField>
          <FormField label="Capacity">
            <StyledInput value={String(vehicles.form.capacity ?? '')} onChangeText={(v) => vehicles.setForm((f: any) => ({ ...f, capacity: v }))} keyboardType="numeric" />
          </FormField>
          <FormField label="Status">
            <SimpleSelect options={VEHICLE_STATUSES} value={vehicles.form.status ?? 'active'} onChange={(v) => vehicles.setForm((f: any) => ({ ...f, status: v }))} />
          </FormField>
        </FormModal>
      )}

      {/* ── Route modal ── */}
      {activeTab === 'routes' && (
        <FormModal visible={routes.showModal} title={routes.editingId ? 'Edit Route' : 'Add Route'} onClose={() => routes.setShowModal(false)} onSave={routes.save} saving={routes.saving}>
          <FormField label="Route Name" required>
            <StyledInput value={routes.form.name ?? ''} onChangeText={(v) => routes.setForm((f: any) => ({ ...f, name: v }))} placeholder="e.g. North Route" />
          </FormField>
          <FormField label="Start Point">
            <StyledInput value={routes.form.start_point ?? ''} onChangeText={(v) => routes.setForm((f: any) => ({ ...f, start_point: v }))} />
          </FormField>
          <FormField label="End Point">
            <StyledInput value={routes.form.end_point ?? ''} onChangeText={(v) => routes.setForm((f: any) => ({ ...f, end_point: v }))} />
          </FormField>
          <FormField label="Distance (km)">
            <StyledInput value={String(routes.form.distance ?? '')} onChangeText={(v) => routes.setForm((f: any) => ({ ...f, distance: v }))} keyboardType="numeric" />
          </FormField>
        </FormModal>
      )}

      {/* ── Assignment modal ── */}
      {activeTab === 'assignments' && (
        <FormModal visible={assignments.showModal} title={assignments.editingId ? 'Edit Assignment' : 'New Assignment'} onClose={() => assignments.setShowModal(false)} onSave={assignments.save} saving={assignments.saving}>
          <FormField label="Member Type" required>
            <SimpleSelect options={MEMBER_TYPES} value={assignments.form.member_type ?? 'student'} onChange={(v) => assignments.setForm((f: any) => ({ ...f, member_type: v }))} />
          </FormField>
          <FormField label="Pickup Stop">
            <StyledInput value={assignments.form.stop_name ?? ''} onChangeText={(v) => assignments.setForm((f: any) => ({ ...f, stop_name: v }))} />
          </FormField>
          <FormField label="Pickup Time">
            <StyledInput value={assignments.form.pickup_time ?? ''} onChangeText={(v) => assignments.setForm((f: any) => ({ ...f, pickup_time: v }))} placeholder="HH:MM" />
          </FormField>
          <FormField label="Drop Time">
            <StyledInput value={assignments.form.drop_time ?? ''} onChangeText={(v) => assignments.setForm((f: any) => ({ ...f, drop_time: v }))} placeholder="HH:MM" />
          </FormField>
        </FormModal>
      )}
    </View>
  );
}
