/**
 * Inventory Screen
 * Sub-tabs: Items | Purchase Orders | Stock Movements
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Alert, RefreshControl, Text } from 'react-native';
import { inventoryItemsApi, purchaseOrdersApi, stockMovementsApi } from '../../core/api/erp.api';
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

const MOVEMENT_TYPES = ['in', 'out', 'transfer', 'adjustment'].map((t) => ({ label: t, value: t }));
const ORDER_STATUSES = ['draft', 'pending', 'approved', 'received', 'cancelled'].map((s) => ({ label: s, value: s }));

const TABS = [
  { key: 'items', label: 'Items' },
  { key: 'orders', label: 'Purchase Orders' },
  { key: 'movements', label: 'Stock Movements' },
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

export default function InventoryScreen() {
  const { schoolId, isAdmin } = useErpRole();
  const [activeTab, setActiveTab] = useState('items');
  const baseParams = schoolId ? { school_id: schoolId } : {};

  const items = useCrud(inventoryItemsApi, baseParams);
  const orders = useCrud(purchaseOrdersApi, baseParams);
  const movements = useCrud(stockMovementsApi, baseParams);

  useEffect(() => {
    if (activeTab === 'items') items.load(1);
    else if (activeTab === 'orders') orders.load(1);
    else movements.load(1);
  }, [activeTab]);

  const sectionMap: Record<string, any> = { items, orders, movements };
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
          section.items.map((item: any) => {
            const isLowStock = activeTab === 'items' && item.min_stock_level != null && item.quantity <= item.min_stock_level;
            return (
              <ListRow
                key={item.id}
                title={item.name ?? item.item_name ?? `#${item.id}`}
                subtitle={[
                  item.category,
                  item.quantity != null ? `Qty: ${item.quantity}` : '',
                  item.unit,
                  item.movement_type,
                  item.total_amount ? `₹${item.total_amount}` : '',
                ].filter(Boolean).join(' · ')}
                rightComponent={
                  isLowStock
                    ? <Text style={{ fontSize: 11, color: COLORS.danger, fontWeight: '700' }}>LOW</Text>
                    : item.status ? <StatusBadge status={item.status} /> : undefined
                }
                onEdit={isAdmin ? () => section.openEdit(item) : undefined}
                onDelete={isAdmin ? () => section.remove(item.id) : undefined}
              />
            );
          })
        )}
        <Pagination page={section.page} total={section.total} perPage={PER_PAGE} onPrev={() => section.load(section.page - 1)} onNext={() => section.load(section.page + 1)} />
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Item modal ── */}
      {activeTab === 'items' && (
        <FormModal visible={items.showModal} title={items.editingId ? 'Edit Item' : 'Add Item'} onClose={() => items.setShowModal(false)} onSave={items.save} saving={items.saving}>
          <FormField label="Item Name" required>
            <StyledInput value={items.form.name ?? ''} onChangeText={(v) => items.setForm((f: any) => ({ ...f, name: v }))} placeholder="Item name" />
          </FormField>
          <FormField label="Category">
            <StyledInput value={items.form.category ?? ''} onChangeText={(v) => items.setForm((f: any) => ({ ...f, category: v }))} placeholder="e.g. Stationery" />
          </FormField>
          <FormField label="Unit">
            <StyledInput value={items.form.unit ?? ''} onChangeText={(v) => items.setForm((f: any) => ({ ...f, unit: v }))} placeholder="pcs / kg / ltr" />
          </FormField>
          <FormField label="Quantity">
            <StyledInput value={String(items.form.quantity ?? '')} onChangeText={(v) => items.setForm((f: any) => ({ ...f, quantity: v }))} keyboardType="numeric" />
          </FormField>
          <FormField label="Min Stock Level">
            <StyledInput value={String(items.form.min_stock_level ?? '')} onChangeText={(v) => items.setForm((f: any) => ({ ...f, min_stock_level: v }))} keyboardType="numeric" placeholder="Alert threshold" />
          </FormField>
          <FormField label="Unit Price">
            <StyledInput value={String(items.form.unit_price ?? '')} onChangeText={(v) => items.setForm((f: any) => ({ ...f, unit_price: v }))} keyboardType="numeric" />
          </FormField>
        </FormModal>
      )}

      {/* ── Purchase Order modal ── */}
      {activeTab === 'orders' && (
        <FormModal visible={orders.showModal} title={orders.editingId ? 'Edit Order' : 'New Purchase Order'} onClose={() => orders.setShowModal(false)} onSave={orders.save} saving={orders.saving}>
          <FormField label="Supplier Name" required>
            <StyledInput value={orders.form.supplier_name ?? ''} onChangeText={(v) => orders.setForm((f: any) => ({ ...f, supplier_name: v }))} />
          </FormField>
          <FormField label="Order Date" required>
            <StyledInput value={orders.form.order_date ?? ''} onChangeText={(v) => orders.setForm((f: any) => ({ ...f, order_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Expected Delivery Date">
            <StyledInput value={orders.form.expected_delivery_date ?? ''} onChangeText={(v) => orders.setForm((f: any) => ({ ...f, expected_delivery_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Total Amount">
            <StyledInput value={String(orders.form.total_amount ?? '')} onChangeText={(v) => orders.setForm((f: any) => ({ ...f, total_amount: v }))} keyboardType="numeric" />
          </FormField>
          <FormField label="Status">
            <SimpleSelect options={ORDER_STATUSES} value={orders.form.status ?? 'draft'} onChange={(v) => orders.setForm((f: any) => ({ ...f, status: v }))} />
          </FormField>
          <FormField label="Notes">
            <StyledInput value={orders.form.notes ?? ''} onChangeText={(v) => orders.setForm((f: any) => ({ ...f, notes: v }))} multiline />
          </FormField>
        </FormModal>
      )}

      {/* ── Stock Movement modal ── */}
      {activeTab === 'movements' && (
        <FormModal visible={movements.showModal} title={movements.editingId ? 'Edit Movement' : 'New Stock Movement'} onClose={() => movements.setShowModal(false)} onSave={movements.save} saving={movements.saving}>
          <FormField label="Movement Type" required>
            <SimpleSelect options={MOVEMENT_TYPES} value={movements.form.movement_type ?? 'in'} onChange={(v) => movements.setForm((f: any) => ({ ...f, movement_type: v }))} />
          </FormField>
          <FormField label="Quantity" required>
            <StyledInput value={String(movements.form.quantity ?? '')} onChangeText={(v) => movements.setForm((f: any) => ({ ...f, quantity: v }))} keyboardType="numeric" />
          </FormField>
          <FormField label="Movement Date">
            <StyledInput value={movements.form.movement_date ?? ''} onChangeText={(v) => movements.setForm((f: any) => ({ ...f, movement_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Reference Number">
            <StyledInput value={movements.form.reference_number ?? ''} onChangeText={(v) => movements.setForm((f: any) => ({ ...f, reference_number: v }))} />
          </FormField>
          <FormField label="Notes">
            <StyledInput value={movements.form.notes ?? ''} onChangeText={(v) => movements.setForm((f: any) => ({ ...f, notes: v }))} multiline />
          </FormField>
        </FormModal>
      )}
    </View>
  );
}
