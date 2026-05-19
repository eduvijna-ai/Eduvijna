/**
 * HR & Payroll Screen
 * Sub-tabs: Staff | Leave Types | Apply Leave | Staff Attendance | Payslips
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, Alert, RefreshControl, Switch, Text, TouchableOpacity } from 'react-native';
import {
  staffProfilesApi,
  leaveTypesApi,
  leaveApplicationsApi,
  staffAttendanceApi,
  payslipsApi,
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

const LEAVE_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'].map((s) => ({ label: s, value: s }));
const PAYSLIP_STATUSES = ['draft', 'generated', 'approved', 'paid', 'cancelled'].map((s) => ({ label: s, value: s }));
const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'leave', 'holiday'].map((s) => ({ label: s, value: s }));

const TABS = [
  { key: 'staff', label: 'Staff' },
  { key: 'leave_types', label: 'Leave Types' },
  { key: 'leaves', label: 'Leaves' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'payslips', label: 'Payslips' },
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

export default function HRScreen() {
  const { schoolId, isAdmin } = useErpRole();
  const [activeTab, setActiveTab] = useState('staff');
  const baseParams = schoolId ? { school_id: schoolId } : {};

  const staff = useCrud(staffProfilesApi, baseParams);
  const leaveTypes = useCrud(leaveTypesApi, baseParams);
  const leaves = useCrud(leaveApplicationsApi, baseParams);
  const attendance = useCrud(staffAttendanceApi, baseParams);
  const payslips = useCrud(payslipsApi, baseParams);

  useEffect(() => {
    if (activeTab === 'staff') staff.load(1);
    else if (activeTab === 'leave_types') leaveTypes.load(1);
    else if (activeTab === 'leaves') leaves.load(1);
    else if (activeTab === 'attendance') attendance.load(1);
    else if (activeTab === 'payslips') payslips.load(1);
  }, [activeTab]);

  const sectionMap: Record<string, any> = { staff, leave_types: leaveTypes, leaves, attendance, payslips };
  const section = sectionMap[activeTab];

  const handleLeaveApproval = async (id: any, status: 'approved' | 'rejected') => {
    try {
      await leaveApplicationsApi.approve(id, { status });
      Alert.alert('Success', `Leave ${status}.`);
      leaves.load(leaves.page);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail ?? 'Action failed.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.gray[50] }}>
      <SubTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <SearchBar value={section.search} onChangeText={section.setSearch} />

      <ScrollView
        refreshControl={<RefreshControl refreshing={section.refreshing} onRefresh={() => { section.setRefreshing(true); section.load(section.page); }} />}
      >
        <SectionHeader
          title={`${section.total} Records`}
          onAdd={
            isAdmin && (activeTab === 'leave_types' || activeTab === 'attendance')
              ? section.openAdd
              : !isAdmin && activeTab === 'leaves'
              ? section.openAdd
              : isAdmin && activeTab === 'leaves'
              ? section.openAdd
              : undefined
          }
        />
        {section.loading ? <LoadingState /> : section.items.length === 0 ? <EmptyState /> : (
          section.items.map((item: any) => (
            <ListRow
              key={item.id}
              title={
                item.full_name ?? item.name ?? item.staff_name ??
                `${item.start_date ?? ''} – ${item.end_date ?? ''}`
              }
              subtitle={[
                item.designation,
                item.leave_type_name,
                item.status,
                item.month ? `Month ${item.month}/${item.year}` : undefined,
              ].filter(Boolean).join(' · ')}
              rightComponent={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {item.status ? <StatusBadge status={item.status} /> : null}
                  {isAdmin && activeTab === 'leaves' && item.status === 'pending' && (
                    <>
                      <TouchableOpacity
                        style={{ backgroundColor: '#10b981', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}
                        onPress={() => handleLeaveApproval(item.id, 'approved')}
                      >
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}
                        onPress={() => handleLeaveApproval(item.id, 'rejected')}
                      >
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              }
              onEdit={isAdmin ? () => section.openEdit(item) : undefined}
              onDelete={isAdmin ? () => section.remove(item.id) : undefined}
            />
          ))
        )}
        <Pagination page={section.page} total={section.total} perPage={PER_PAGE} onPrev={() => section.load(section.page - 1)} onNext={() => section.load(section.page + 1)} />
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Leave Types modal (admin) ── */}
      {activeTab === 'leave_types' && (
        <FormModal visible={leaveTypes.showModal} title={leaveTypes.editingId ? 'Edit Leave Type' : 'New Leave Type'} onClose={() => leaveTypes.setShowModal(false)} onSave={leaveTypes.save} saving={leaveTypes.saving}>
          <FormField label="Leave Type Name" required>
            <StyledInput value={leaveTypes.form.name ?? ''} onChangeText={(v) => leaveTypes.setForm((f: any) => ({ ...f, name: v }))} placeholder="e.g. Sick Leave" />
          </FormField>
          <FormField label="Max Days Per Year">
            <StyledInput value={String(leaveTypes.form.max_days ?? '')} onChangeText={(v) => leaveTypes.setForm((f: any) => ({ ...f, max_days: v }))} keyboardType="numeric" placeholder="12" />
          </FormField>
          <FormField label="Description">
            <StyledInput value={leaveTypes.form.description ?? ''} onChangeText={(v) => leaveTypes.setForm((f: any) => ({ ...f, description: v }))} multiline />
          </FormField>
        </FormModal>
      )}

      {/* ── Leave Application modal ── */}
      {activeTab === 'leaves' && (
        <FormModal visible={leaves.showModal} title={leaves.editingId ? 'Edit Leave' : 'Apply for Leave'} onClose={() => leaves.setShowModal(false)} onSave={leaves.save} saving={leaves.saving}>
          <FormField label="Start Date" required>
            <StyledInput value={leaves.form.start_date ?? ''} onChangeText={(v) => leaves.setForm((f: any) => ({ ...f, start_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="End Date" required>
            <StyledInput value={leaves.form.end_date ?? ''} onChangeText={(v) => leaves.setForm((f: any) => ({ ...f, end_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Reason" required>
            <StyledInput value={leaves.form.reason ?? ''} onChangeText={(v) => leaves.setForm((f: any) => ({ ...f, reason: v }))} multiline numberOfLines={3} placeholder="Reason for leave" />
          </FormField>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.gray[700] }}>Half Day</Text>
            <Switch value={!!leaves.form.half_day} onValueChange={(v) => leaves.setForm((f: any) => ({ ...f, half_day: v }))} trackColor={{ true: COLORS.primary }} />
          </View>
          {isAdmin && (
            <FormField label="Status">
              <SimpleSelect options={LEAVE_STATUSES} value={leaves.form.status ?? 'pending'} onChange={(v) => leaves.setForm((f: any) => ({ ...f, status: v }))} />
            </FormField>
          )}
        </FormModal>
      )}

      {/* ── Staff Attendance modal (admin) ── */}
      {activeTab === 'attendance' && (
        <FormModal visible={attendance.showModal} title={attendance.editingId ? 'Edit Attendance' : 'New Attendance'} onClose={() => attendance.setShowModal(false)} onSave={attendance.save} saving={attendance.saving}>
          <FormField label="Date" required>
            <StyledInput value={attendance.form.date ?? ''} onChangeText={(v) => attendance.setForm((f: any) => ({ ...f, date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Status" required>
            <SimpleSelect options={ATTENDANCE_STATUSES} value={attendance.form.status ?? 'present'} onChange={(v) => attendance.setForm((f: any) => ({ ...f, status: v }))} />
          </FormField>
          <FormField label="Check In">
            <StyledInput value={attendance.form.check_in ?? ''} onChangeText={(v) => attendance.setForm((f: any) => ({ ...f, check_in: v }))} placeholder="HH:MM" />
          </FormField>
          <FormField label="Check Out">
            <StyledInput value={attendance.form.check_out ?? ''} onChangeText={(v) => attendance.setForm((f: any) => ({ ...f, check_out: v }))} placeholder="HH:MM" />
          </FormField>
        </FormModal>
      )}

      {/* ── Payslip modal (admin) ── */}
      {activeTab === 'payslips' && isAdmin && (
        <FormModal visible={payslips.showModal} title={payslips.editingId ? 'Edit Payslip' : 'Generate Payslip'} onClose={() => payslips.setShowModal(false)} onSave={payslips.save} saving={payslips.saving}>
          <FormField label="Month" required>
            <StyledInput value={String(payslips.form.month ?? '')} onChangeText={(v) => payslips.setForm((f: any) => ({ ...f, month: v }))} keyboardType="numeric" placeholder="1–12" />
          </FormField>
          <FormField label="Year" required>
            <StyledInput value={String(payslips.form.year ?? '')} onChangeText={(v) => payslips.setForm((f: any) => ({ ...f, year: v }))} keyboardType="numeric" placeholder="2024" />
          </FormField>
          <FormField label="Basic Salary">
            <StyledInput value={String(payslips.form.basic_salary ?? '')} onChangeText={(v) => payslips.setForm((f: any) => ({ ...f, basic_salary: v }))} keyboardType="numeric" />
          </FormField>
          <FormField label="Allowances">
            <StyledInput value={String(payslips.form.allowances ?? '')} onChangeText={(v) => payslips.setForm((f: any) => ({ ...f, allowances: v }))} keyboardType="numeric" />
          </FormField>
          <FormField label="Deductions">
            <StyledInput value={String(payslips.form.deductions ?? '')} onChangeText={(v) => payslips.setForm((f: any) => ({ ...f, deductions: v }))} keyboardType="numeric" />
          </FormField>
          <FormField label="Status">
            <SimpleSelect options={PAYSLIP_STATUSES} value={payslips.form.status ?? 'draft'} onChange={(v) => payslips.setForm((f: any) => ({ ...f, status: v }))} />
          </FormField>
        </FormModal>
      )}
    </View>
  );
}
