/**
 * Notices Screen
 * Full CRUD for school notices with category filtering.
 * Categories: general | academic | fee | event | exam | holiday
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Alert,
  RefreshControl,
  Switch,
  Text,
} from 'react-native';
import { noticesApi } from '../../core/api/erp.api';
import {
  COLORS,
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
} from '../components/common';
import { useErpRole } from '../hooks/useErpRole';

const CATEGORIES = [
  { label: 'All', value: '' },
  { label: 'General', value: 'general' },
  { label: 'Academic', value: 'academic' },
  { label: 'Fee', value: 'fee' },
  { label: 'Event', value: 'event' },
  { label: 'Exam', value: 'exam' },
  { label: 'Holiday', value: 'holiday' },
];

const CATEGORY_COLORS: Record<string, string> = {
  general: COLORS.gray[500],
  academic: COLORS.primary,
  fee: '#14b8a6',
  event: '#8b5cf6',
  exam: '#f59e0b',
  holiday: '#ef4444',
};

const PER_PAGE = 25;

const EMPTY_FORM = {
  title: '',
  content: '',
  category: 'general',
  is_pinned: false,
  publish_date: '',
  expiry_date: '',
};

export default function NoticesScreen() {
  const { schoolId, isAdmin } = useErpRole();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const baseParams = schoolId ? { school_id: schoolId } : {};

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const data = await noticesApi.getAll({
        page: p, per_page: PER_PAGE,
        q: search || undefined,
        category: category || undefined,
        ...baseParams,
      });
      setItems(data?.items ?? data ?? []);
      setTotal(data?.total ?? (data?.items?.length ?? 0));
      setPage(p);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [schoolId, search, category]);

  useEffect(() => {
    const t = setTimeout(() => load(1), 300);
    return () => clearTimeout(t);
  }, [search, category]);

  const openAdd = () => { setEditingId(null); setForm({ ...EMPTY_FORM }); setShowModal(true); };
  const openEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      title: item.title ?? '',
      content: item.content ?? '',
      category: item.category ?? 'general',
      is_pinned: !!item.is_pinned,
      publish_date: item.publish_date ?? '',
      expiry_date: item.expiry_date ?? '',
    });
    setShowModal(true);
  };

  const validate = () => {
    if (!form.title.trim()) { Alert.alert('Validation', 'Title is required.'); return false; }
    if (!form.content.trim()) { Alert.alert('Validation', 'Content is required.'); return false; }
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingId) await noticesApi.update(editingId, { ...form, ...baseParams });
      else await noticesApi.create({ ...form, ...baseParams });
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
      await noticesApi.softDelete(id);
      load(page);
    } catch {
      Alert.alert('Error', 'Delete failed.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.gray[50] }}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search notices…" />

      {/* Category filter */}
      <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
        <SimpleSelect
          options={CATEGORIES}
          value={category}
          onChange={(v) => setCategory(v as string)}
          placeholder="Filter by category"
        />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(page); }} />}
      >
        <SectionHeader
          title={`${total} Notices`}
          onAdd={isAdmin ? openAdd : undefined}
        />
        {loading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          items.map((n) => (
            <ListRow
              key={n.id}
              title={`${n.is_pinned ? '📌 ' : ''}${n.title}`}
              subtitle={`${n.content?.substring(0, 80) ?? ''}`}
              badge={n.category}
              badgeColor={CATEGORY_COLORS[n.category] ?? COLORS.gray[500]}
              onEdit={isAdmin ? () => openEdit(n) : undefined}
              onDelete={isAdmin ? () => remove(n.id) : undefined}
            />
          ))
        )}
        <Pagination
          page={page} total={total} perPage={PER_PAGE}
          onPrev={() => load(page - 1)} onNext={() => load(page + 1)}
        />
        <View style={{ height: 40 }} />
      </ScrollView>

      <FormModal
        visible={showModal}
        title={editingId ? 'Edit Notice' : 'New Notice'}
        onClose={() => setShowModal(false)}
        onSave={save}
        saving={saving}
      >
        <FormField label="Title" required>
          <StyledInput value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="Notice title" />
        </FormField>
        <FormField label="Content" required>
          <StyledInput value={form.content} onChangeText={(v) => setForm((f) => ({ ...f, content: v }))} placeholder="Notice content" multiline numberOfLines={4} />
        </FormField>
        <FormField label="Category">
          <SimpleSelect
            options={CATEGORIES.filter((c) => c.value)}
            value={form.category}
            onChange={(v) => setForm((f) => ({ ...f, category: v as string }))}
          />
        </FormField>
        <FormField label="Publish Date">
          <StyledInput value={form.publish_date} onChangeText={(v) => setForm((f) => ({ ...f, publish_date: v }))} placeholder="YYYY-MM-DD" />
        </FormField>
        <FormField label="Expiry Date">
          <StyledInput value={form.expiry_date} onChangeText={(v) => setForm((f) => ({ ...f, expiry_date: v }))} placeholder="YYYY-MM-DD" />
        </FormField>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.gray[700] }}>Pin Notice</Text>
          <Switch
            value={form.is_pinned}
            onValueChange={(v) => setForm((f) => ({ ...f, is_pinned: v }))}
            trackColor={{ true: COLORS.primary }}
          />
        </View>
      </FormModal>
    </View>
  );
}
