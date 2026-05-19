/**
 * Library Screen
 * Sub-tabs: Books | Transactions
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Alert, RefreshControl } from 'react-native';
import { booksApi, libraryTransactionsApi } from '../../core/api/erp.api';
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

const MEMBER_TYPES = [{ label: 'Student', value: 'student' }, { label: 'Staff', value: 'staff' }];
const TRANSACTION_STATUSES = ['issued', 'returned', 'overdue', 'lost'].map((s) => ({ label: s, value: s }));

const TABS = [
  { key: 'books', label: 'Books' },
  { key: 'transactions', label: 'Transactions' },
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

export default function LibraryScreen() {
  const { schoolId, isAdmin } = useErpRole();
  const [activeTab, setActiveTab] = useState('books');
  const baseParams = schoolId ? { school_id: schoolId } : {};

  const books = useCrud(booksApi, baseParams);
  const transactions = useCrud(libraryTransactionsApi, baseParams);

  useEffect(() => {
    if (activeTab === 'books') books.load(1);
    else transactions.load(1);
  }, [activeTab]);

  const section = activeTab === 'books' ? books : transactions;

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
              title={item.title ?? item.book_title ?? `#${item.id}`}
              subtitle={
                activeTab === 'books'
                  ? [item.author, item.isbn, `Copies: ${item.available_copies ?? 0}/${item.total_copies ?? 0}`].filter(Boolean).join(' · ')
                  : [item.member_type, item.issue_date, item.due_date].filter(Boolean).join(' · ')
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

      {/* ── Books modal ── */}
      {activeTab === 'books' && (
        <FormModal visible={books.showModal} title={books.editingId ? 'Edit Book' : 'Add Book'} onClose={() => books.setShowModal(false)} onSave={books.save} saving={books.saving}>
          <FormField label="Title" required>
            <StyledInput value={books.form.title ?? ''} onChangeText={(v) => books.setForm((f: any) => ({ ...f, title: v }))} placeholder="Book title" />
          </FormField>
          <FormField label="Author">
            <StyledInput value={books.form.author ?? ''} onChangeText={(v) => books.setForm((f: any) => ({ ...f, author: v }))} />
          </FormField>
          <FormField label="ISBN">
            <StyledInput value={books.form.isbn ?? ''} onChangeText={(v) => books.setForm((f: any) => ({ ...f, isbn: v }))} />
          </FormField>
          <FormField label="Publisher">
            <StyledInput value={books.form.publisher ?? ''} onChangeText={(v) => books.setForm((f: any) => ({ ...f, publisher: v }))} />
          </FormField>
          <FormField label="Category">
            <StyledInput value={books.form.category ?? ''} onChangeText={(v) => books.setForm((f: any) => ({ ...f, category: v }))} placeholder="e.g. Science" />
          </FormField>
          <FormField label="Total Copies">
            <StyledInput value={String(books.form.total_copies ?? '')} onChangeText={(v) => books.setForm((f: any) => ({ ...f, total_copies: v }))} keyboardType="numeric" />
          </FormField>
          <FormField label="Shelf Location">
            <StyledInput value={books.form.shelf_location ?? ''} onChangeText={(v) => books.setForm((f: any) => ({ ...f, shelf_location: v }))} placeholder="Row / Shelf" />
          </FormField>
        </FormModal>
      )}

      {/* ── Transactions modal ── */}
      {activeTab === 'transactions' && (
        <FormModal visible={transactions.showModal} title={transactions.editingId ? 'Edit Transaction' : 'Issue Book'} onClose={() => transactions.setShowModal(false)} onSave={transactions.save} saving={transactions.saving}>
          <FormField label="Member Type" required>
            <SimpleSelect options={MEMBER_TYPES} value={transactions.form.member_type ?? 'student'} onChange={(v) => transactions.setForm((f: any) => ({ ...f, member_type: v }))} />
          </FormField>
          <FormField label="Issue Date" required>
            <StyledInput value={transactions.form.issue_date ?? ''} onChangeText={(v) => transactions.setForm((f: any) => ({ ...f, issue_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Due Date" required>
            <StyledInput value={transactions.form.due_date ?? ''} onChangeText={(v) => transactions.setForm((f: any) => ({ ...f, due_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Return Date">
            <StyledInput value={transactions.form.return_date ?? ''} onChangeText={(v) => transactions.setForm((f: any) => ({ ...f, return_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Fine">
            <StyledInput value={String(transactions.form.fine ?? '')} onChangeText={(v) => transactions.setForm((f: any) => ({ ...f, fine: v }))} keyboardType="numeric" placeholder="0" />
          </FormField>
          <FormField label="Status">
            <SimpleSelect options={TRANSACTION_STATUSES} value={transactions.form.status ?? 'issued'} onChange={(v) => transactions.setForm((f: any) => ({ ...f, status: v }))} />
          </FormField>
        </FormModal>
      )}
    </View>
  );
}
