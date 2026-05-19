/**
 * Fees Screen
 * Sub-tabs: Summary | Fee Structures | Collections | Receipts | Demand Bill | Payment Plans
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Alert, RefreshControl, Text, TouchableOpacity } from 'react-native';
import {
  feeReportsApi,
  feeStructuresApi,
  feeCollectionsApi,
  feeReceiptsApi,
  demandBillApi,
  feePaymentPlansApi,
  studentFeeAssignmentsApi,
} from '../../core/api/erp.api';
import {
  COLORS,
  SubTabBar,
  SearchBar,
  KpiCard,
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
import { useAcademicYear } from '../contexts/AcademicYearContext';

const PAYMENT_METHODS = ['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'online', 'wallet'].map((m) => ({ label: m, value: m }));

const COLLECTION_STATUSES = ['pending', 'partial', 'paid', 'overdue', 'waived', 'refunded'].map((s) => ({ label: s, value: s }));

const TABS = [
  { key: 'summary', label: 'Summary' },
  { key: 'structures', label: 'Structures' },
  { key: 'collections', label: 'Collections' },
  { key: 'receipts', label: 'Receipts' },
  { key: 'assignments', label: 'Assign' },
  { key: 'register', label: 'Register' },
  { key: 'demand', label: 'Demand Bill' },
  { key: 'plans', label: 'Pay Plans' },
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

export default function FeesScreen() {
  const { schoolId, isAdmin } = useErpRole();
  const { selectedYearId } = useAcademicYear();
  const [activeTab, setActiveTab] = useState('summary');
  const baseParams = {
    ...(schoolId ? { school_id: schoolId } : {}),
    ...(selectedYearId ? { academic_year_id: selectedYearId } : {}),
  };

  const [kpi, setKpi] = useState<Record<string, any>>({});
  const [kpiLoading, setKpiLoading] = useState(false);
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);

  const structures = useCrud(feeStructuresApi, baseParams);
  const collections = useCrud(feeCollectionsApi, baseParams);
  const receipts = useCrud(feeReceiptsApi, baseParams);
  const demand = useCrud(demandBillApi, baseParams);
  const plans = useCrud(feePaymentPlansApi, baseParams);
  const assignments = useCrud(studentFeeAssignmentsApi, baseParams);
  const register = useCrud({ list: (p: any) => feeReportsApi.register(p) }, baseParams);

  const loadKpi = async () => {
    setKpiLoading(true);
    try {
      const [summaryData, defaultersData, trendRes] = await Promise.all([
        feeReportsApi.summary({ ...baseParams }),
        feeReportsApi.defaulters({ ...baseParams, per_page: 5 }),
        feeReportsApi.trend({ ...baseParams }),
      ]);
      setKpi(summaryData ?? {});
      setDefaulters(defaultersData?.items ?? defaultersData ?? []);
      setTrendData(trendRes?.items ?? trendRes ?? []);
    } catch { /* ignore */ }
    finally { setKpiLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'summary') loadKpi();
    else if (activeTab === 'structures') structures.load(1);
    else if (activeTab === 'collections') collections.load(1);
    else if (activeTab === 'receipts') receipts.load(1);
    else if (activeTab === 'assignments') assignments.load(1);
    else if (activeTab === 'register') register.load(1);
    else if (activeTab === 'demand') demand.load(1);
    else if (activeTab === 'plans') plans.load(1);
  }, [activeTab]);

  const sectionMap: Record<string, any> = { structures, collections, receipts, demand, plans, assignments, register };
  const section = sectionMap[activeTab];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.gray[50] }}>
      <SubTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab !== 'summary' && (
        <SearchBar value={section?.search} onChangeText={section?.setSearch} />
      )}

      <ScrollView
        refreshControl={
          <RefreshControl
        refreshing={section?.refreshing ?? false}
            onRefresh={() => {
              if (activeTab === 'summary') loadKpi();
              else if (section) { section.setRefreshing(true); section.load(section.page); }
            }}
          />
        }
      >
        {/* ── Summary ── */}
        {activeTab === 'summary' && (
          kpiLoading ? <LoadingState /> : (
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <KpiCard label="Total Due" value={kpi.total_due ?? '-'} color={COLORS.primary} />
                <KpiCard label="Collected" value={kpi.collected ?? '-'} color={COLORS.success} />
                <KpiCard label="Pending" value={kpi.pending ?? '-'} color={COLORS.warning} />
                <KpiCard label="Collection Rate" value={kpi.collection_rate ? `${kpi.collection_rate}%` : '-'} color={COLORS.info} />
                <KpiCard label="Overdue" value={kpi.overdue ?? '-'} color={COLORS.danger} />
                <KpiCard label="Defaulters" value={kpi.defaulters_count ?? kpi.defaulters ?? '-'} color={COLORS.danger} />
              </View>

              {/* Trend */}
              {trendData.length > 0 && (
                <View style={{ marginTop: 20 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.gray[800], marginBottom: 10 }}>Monthly Collection Trend</Text>
                  {trendData.map((t: any, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.gray[100] }}>
                      <Text style={{ fontSize: 13, color: COLORS.gray[600] }}>{t.month ?? t.label ?? `Period ${i + 1}`}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.primary }}>₹{t.collected ?? t.amount ?? '-'}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Top Defaulters */}
              {defaulters.length > 0 && (
                <View style={{ marginTop: 20 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.gray[800], marginBottom: 10 }}>Top Defaulters</Text>
                  {defaulters.map((d: any, i: number) => (
                    <View key={d.id ?? i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.gray[100] }}>
                      <Text style={{ fontSize: 13, color: COLORS.gray[800], flex: 1 }}>{d.student_name ?? d.name ?? `Student #${d.student_id}`}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.danger }}>₹{d.overdue ?? d.pending ?? '-'}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )
        )}

        {/* ── List sections ── */}
        {activeTab !== 'summary' && section && (
          <>
            <SectionHeader
              title={`${section.total} Records`}
              onAdd={(isAdmin && activeTab !== 'receipts' && activeTab !== 'register') ? section.openAdd : undefined}
            />
            {section.loading ? <LoadingState /> : section.items.length === 0 ? <EmptyState /> : (
              section.items.map((item: any) => (
                <ListRow
                  key={item.id}
                  title={item.name ?? item.fee_name ?? item.student_name ?? item.receipt_number ?? `#${item.id}`}
                  subtitle={[item.amount ? `₹${item.amount}` : '', item.due_date, item.payment_method].filter(Boolean).join(' · ')}
                  rightComponent={item.status ? <StatusBadge status={item.status} /> : undefined}
                  onEdit={(isAdmin && activeTab !== 'receipts' && activeTab !== 'register') ? () => section.openEdit(item) : undefined}
                  onDelete={(isAdmin && activeTab !== 'receipts' && activeTab !== 'register') ? () => section.remove(item.id) : undefined}
                />
              ))
            )}
            <Pagination page={section.page} total={section.total} perPage={PER_PAGE} onPrev={() => section.load(section.page - 1)} onNext={() => section.load(section.page + 1)} />
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Fee Assignment modal ── */}
      {activeTab === 'assignments' && (
        <FormModal visible={assignments.showModal} title={assignments.editingId ? 'Edit Assignment' : 'Assign Fee'} onClose={() => assignments.setShowModal(false)} onSave={assignments.save} saving={assignments.saving}>
          <FormField label="Student ID" required>
            <StyledInput value={String(assignments.form.student_id ?? '')} onChangeText={(v) => assignments.setForm((f: any) => ({ ...f, student_id: v }))} keyboardType="numeric" placeholder="Student ID" />
          </FormField>
          <FormField label="Fee Structure ID" required>
            <StyledInput value={String(assignments.form.fee_structure_id ?? '')} onChangeText={(v) => assignments.setForm((f: any) => ({ ...f, fee_structure_id: v }))} keyboardType="numeric" placeholder="Fee Structure ID" />
          </FormField>
          <FormField label="Discount (%)">
            <StyledInput value={String(assignments.form.discount_percent ?? '')} onChangeText={(v) => assignments.setForm((f: any) => ({ ...f, discount_percent: v }))} keyboardType="numeric" placeholder="0" />
          </FormField>
          <FormField label="Remarks">
            <StyledInput value={assignments.form.remarks ?? ''} onChangeText={(v) => assignments.setForm((f: any) => ({ ...f, remarks: v }))} multiline />
          </FormField>
        </FormModal>
      )}

      {/* ── Fee Structure modal ── */}
      {activeTab === 'structures' && (
        <FormModal visible={structures.showModal} title={structures.editingId ? 'Edit Fee Structure' : 'New Fee Structure'} onClose={() => structures.setShowModal(false)} onSave={structures.save} saving={structures.saving}>
          <FormField label="Name" required>
            <StyledInput value={structures.form.name ?? ''} onChangeText={(v) => structures.setForm((f: any) => ({ ...f, name: v }))} placeholder="e.g. Tuition Fee Term 1" />
          </FormField>
          <FormField label="Amount" required>
            <StyledInput value={String(structures.form.amount ?? '')} onChangeText={(v) => structures.setForm((f: any) => ({ ...f, amount: v }))} keyboardType="numeric" placeholder="5000" />
          </FormField>
          <FormField label="Due Date">
            <StyledInput value={structures.form.due_date ?? ''} onChangeText={(v) => structures.setForm((f: any) => ({ ...f, due_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Late Fine (per day)">
            <StyledInput value={String(structures.form.late_fine ?? '')} onChangeText={(v) => structures.setForm((f: any) => ({ ...f, late_fine: v }))} keyboardType="numeric" placeholder="0" />
          </FormField>
        </FormModal>
      )}

      {/* ── Collections modal ── */}
      {activeTab === 'collections' && (
        <FormModal visible={collections.showModal} title={collections.editingId ? 'Edit Collection' : 'New Collection'} onClose={() => collections.setShowModal(false)} onSave={collections.save} saving={collections.saving}>
          <FormField label="Amount Paid" required>
            <StyledInput value={String(collections.form.amount_paid ?? '')} onChangeText={(v) => collections.setForm((f: any) => ({ ...f, amount_paid: v }))} keyboardType="numeric" />
          </FormField>
          <FormField label="Payment Method">
            <SimpleSelect options={PAYMENT_METHODS} value={collections.form.payment_method ?? 'cash'} onChange={(v) => collections.setForm((f: any) => ({ ...f, payment_method: v }))} />
          </FormField>
          <FormField label="Status">
            <SimpleSelect options={COLLECTION_STATUSES} value={collections.form.status ?? 'pending'} onChange={(v) => collections.setForm((f: any) => ({ ...f, status: v }))} />
          </FormField>
          <FormField label="Transaction Reference">
            <StyledInput value={collections.form.transaction_ref ?? ''} onChangeText={(v) => collections.setForm((f: any) => ({ ...f, transaction_ref: v }))} placeholder="Reference / UTR number" />
          </FormField>
          <FormField label="Payment Date">
            <StyledInput value={collections.form.payment_date ?? ''} onChangeText={(v) => collections.setForm((f: any) => ({ ...f, payment_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Remarks">
            <StyledInput value={collections.form.remarks ?? ''} onChangeText={(v) => collections.setForm((f: any) => ({ ...f, remarks: v }))} multiline />
          </FormField>
        </FormModal>
      )}

      {/* ── Demand Bill modal ── */}
      {activeTab === 'demand' && (
        <FormModal visible={demand.showModal} title={demand.editingId ? 'Edit Demand Bill' : 'New Demand Bill'} onClose={() => demand.setShowModal(false)} onSave={demand.save} saving={demand.saving}>
          <FormField label="Due Date" required>
            <StyledInput value={demand.form.due_date ?? ''} onChangeText={(v) => demand.setForm((f: any) => ({ ...f, due_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Remarks">
            <StyledInput value={demand.form.remarks ?? ''} onChangeText={(v) => demand.setForm((f: any) => ({ ...f, remarks: v }))} multiline />
          </FormField>
        </FormModal>
      )}

      {/* ── Payment Plans modal ── */}
      {activeTab === 'plans' && (
        <FormModal visible={plans.showModal} title={plans.editingId ? 'Edit Payment Plan' : 'New Payment Plan'} onClose={() => plans.setShowModal(false)} onSave={plans.save} saving={plans.saving}>
          <FormField label="Plan Name" required>
            <StyledInput value={plans.form.name ?? ''} onChangeText={(v) => plans.setForm((f: any) => ({ ...f, name: v }))} placeholder="e.g. Monthly Plan" />
          </FormField>
          <FormField label="Installments">
            <StyledInput value={String(plans.form.installments ?? '')} onChangeText={(v) => plans.setForm((f: any) => ({ ...f, installments: v }))} keyboardType="numeric" placeholder="3" />
          </FormField>
          <FormField label="Description">
            <StyledInput value={plans.form.description ?? ''} onChangeText={(v) => plans.setForm((f: any) => ({ ...f, description: v }))} multiline />
          </FormField>
        </FormModal>
      )}
    </View>
  );
}
