/**
 * Exams Screen
 * Sub-tabs: Exam Groups | Exams | Schedules | Marks | Results
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Alert, RefreshControl, Switch, Text, TouchableOpacity } from 'react-native';
import {
  examGroupsApi,
  examsApi,
  examSchedulesApi,
  examMarksApi,
  examResultsApi,
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
import { useAcademicYear } from '../contexts/AcademicYearContext';

const EXAM_TYPES = ['written', 'practical', 'oral', 'project', 'online'].map((t) => ({ label: t, value: t }));

const TABS = [
  { key: 'groups', label: 'Groups' },
  { key: 'exams', label: 'Exams' },
  { key: 'schedules', label: 'Schedules' },
  { key: 'marks', label: 'Marks' },
  { key: 'results', label: 'Results' },
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

export default function ExamsScreen() {
  const { schoolId, isAdmin } = useErpRole();
  const { selectedYearId } = useAcademicYear();
  const [activeTab, setActiveTab] = useState('groups');
  const baseParams = {
    ...(schoolId ? { school_id: schoolId } : {}),
    ...(selectedYearId ? { academic_year_id: selectedYearId } : {}),
  };

  const groups = useCrud(examGroupsApi, baseParams);
  const exams = useCrud(examsApi, baseParams);
  const schedules = useCrud(examSchedulesApi, baseParams);
  const marks = useCrud(examMarksApi, baseParams);
  const results = useCrud(examResultsApi, baseParams);

  // Bulk marks entry state
  const [marksFilter, setMarksFilter] = useState<{ exam_id: string; class_id: string }>({ exam_id: '', class_id: '' });
  const [marksEntries, setMarksEntries] = useState<Record<string, string>>({});
  const [savingBulk, setSavingBulk] = useState(false);

  // Results filter
  const [resultsFilter, setResultsFilter] = useState<{ exam_id: string; class_id: string }>({ exam_id: '', class_id: '' });

  useEffect(() => {
    if (activeTab === 'groups') groups.load(1);
    else if (activeTab === 'exams') exams.load(1);
    else if (activeTab === 'schedules') schedules.load(1);
    else if (activeTab === 'marks') marks.load(1);
    else if (activeTab === 'results') results.load(1);
  }, [activeTab]);

  const loadMarksByFilter = () => {
    marks.load(1);
  };

  const loadResultsByFilter = () => {
    results.load(1);
  };

  const saveBulkMarks = async () => {
    const records = Object.entries(marksEntries)
      .filter(([, v]) => v !== '')
      .map(([student_id, marks_obtained]) => ({
        student_id: Number(student_id),
        marks_obtained: Number(marks_obtained),
        exam_id: marksFilter.exam_id ? Number(marksFilter.exam_id) : undefined,
        ...baseParams,
      }));
    if (records.length === 0) return;
    setSavingBulk(true);
    try {
      await examMarksApi.bulkUpsert({ records, ...baseParams });
      Alert.alert('Success', `${records.length} marks saved.`);
      setMarksEntries({});
      marks.load(1);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail ?? 'Failed to save marks.');
    } finally {
      setSavingBulk(false);
    }
  };

  const section =
    activeTab === 'groups' ? groups :
    activeTab === 'exams' ? exams :
    activeTab === 'schedules' ? schedules :
    activeTab === 'marks' ? marks : results;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.gray[50] }}>
      <SubTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab !== 'marks' && activeTab !== 'results' && (
        <SearchBar value={section.search} onChangeText={section.setSearch} />
      )}

      <ScrollView
        refreshControl={<RefreshControl refreshing={section.refreshing} onRefresh={() => { section.setRefreshing(true); section.load(section.page); }} />}
      >
        {/* ── Marks tab: filters + bulk entry ── */}
        {activeTab === 'marks' && (
          <View style={{ padding: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <View style={{ flex: 1 }}>
                <StyledInput
                  value={marksFilter.exam_id}
                  onChangeText={(v) => setMarksFilter((f) => ({ ...f, exam_id: v }))}
                  placeholder="Exam ID"
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <StyledInput
                  value={marksFilter.class_id}
                  onChangeText={(v) => setMarksFilter((f) => ({ ...f, class_id: v }))}
                  placeholder="Class ID"
                  keyboardType="numeric"
                />
              </View>
              <TouchableOpacity
                style={{ backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, justifyContent: 'center' }}
                onPress={loadMarksByFilter}
              >
                <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 13 }}>Load</Text>
              </TouchableOpacity>
            </View>

            {marks.loading ? <LoadingState /> : marks.items.length === 0 ? (
              <EmptyState message="Enter Exam ID and Class ID to load students for mark entry." />
            ) : (
              <>
                {marks.items.map((item: any) => (
                  <View key={item.id ?? item.student_id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.gray[100] }}>
                    <Text style={{ flex: 1, fontSize: 13, color: COLORS.gray[800] }}>
                      {item.student_name ?? item.full_name ?? `Student #${item.student_id}`}
                    </Text>
                    <StyledInput
                      style={{ width: 80 }}
                      value={marksEntries[item.student_id] ?? (item.marks_obtained !== undefined ? String(item.marks_obtained) : '')}
                      onChangeText={(v) => setMarksEntries((prev) => ({ ...prev, [item.student_id]: v }))}
                      keyboardType="numeric"
                      placeholder="Marks"
                    />
                  </View>
                ))}
                {isAdmin && (
                  <TouchableOpacity
                    style={{ backgroundColor: COLORS.primary, padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 12 }}
                    onPress={saveBulkMarks}
                    disabled={savingBulk}
                  >
                    <Text style={{ color: COLORS.white, fontWeight: '700' }}>{savingBulk ? 'Saving…' : 'Save All Marks'}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        {/* ── Results tab: filters + list ── */}
        {activeTab === 'results' && (
          <View style={{ padding: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <View style={{ flex: 1 }}>
                <StyledInput
                  value={resultsFilter.exam_id}
                  onChangeText={(v) => setResultsFilter((f) => ({ ...f, exam_id: v }))}
                  placeholder="Exam ID"
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <StyledInput
                  value={resultsFilter.class_id}
                  onChangeText={(v) => setResultsFilter((f) => ({ ...f, class_id: v }))}
                  placeholder="Class ID"
                  keyboardType="numeric"
                />
              </View>
              <TouchableOpacity
                style={{ backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, justifyContent: 'center' }}
                onPress={loadResultsByFilter}
              >
                <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 13 }}>Load</Text>
              </TouchableOpacity>
            </View>
            <SectionHeader title={`${results.total} Results`} />
            {results.loading ? <LoadingState /> : results.items.length === 0 ? <EmptyState /> : (
              results.items.map((item: any) => (
                <ListRow
                  key={item.id}
                  title={item.student_name ?? item.full_name ?? `#${item.id}`}
                  subtitle={[
                    item.marks_obtained !== undefined ? `Marks: ${item.marks_obtained}` : '',
                    item.percentage !== undefined ? `${item.percentage}%` : '',
                    item.grade ?? '',
                    item.result ?? '',
                  ].filter(Boolean).join('  ·  ')}
                  rightComponent={item.result ? <StatusBadge status={item.result === 'pass' ? 'active' : 'inactive'} /> : undefined}
                />
              ))
            )}
            <Pagination page={results.page} total={results.total} perPage={PER_PAGE} onPrev={() => results.load(results.page - 1)} onNext={() => results.load(results.page + 1)} />
          </View>
        )}

        {/* ── Other tabs ── */}
        {activeTab !== 'marks' && activeTab !== 'results' && (
          <>
            <SectionHeader
              title={`${section.total} Records`}
              onAdd={(isAdmin && activeTab !== 'marks' && activeTab !== 'results') ? section.openAdd : undefined}
            />
            {section.loading ? <LoadingState /> : section.items.length === 0 ? <EmptyState /> : (
              section.items.map((item: any) => (
                <ListRow
                  key={item.id}
                  title={item.name ?? item.exam_name ?? item.group_name ?? `#${item.id}`}
                  subtitle={[item.exam_type, item.start_date, item.class_name].filter(Boolean).join(' · ')}
                  rightComponent={item.is_published !== undefined ? <StatusBadge status={item.is_published ? 'published' : 'draft'} /> : undefined}
                  onEdit={(isAdmin && activeTab !== 'marks' && activeTab !== 'results') ? () => section.openEdit(item) : undefined}
                  onDelete={(isAdmin && activeTab !== 'marks' && activeTab !== 'results') ? () => section.remove(item.id) : undefined}
                />
              ))
            )}
            <Pagination page={section.page} total={section.total} perPage={PER_PAGE} onPrev={() => section.load(section.page - 1)} onNext={() => section.load(section.page + 1)} />
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Exam Groups modal ── */}
      {activeTab === 'groups' && (
        <FormModal visible={groups.showModal} title={groups.editingId ? 'Edit Group' : 'New Exam Group'} onClose={() => groups.setShowModal(false)} onSave={groups.save} saving={groups.saving}>
          <FormField label="Group Name" required>
            <StyledInput value={groups.form.name ?? ''} onChangeText={(v) => groups.setForm((f: any) => ({ ...f, name: v }))} placeholder="e.g. Term 1 Exams" />
          </FormField>
          <FormField label="Start Date">
            <StyledInput value={groups.form.start_date ?? ''} onChangeText={(v) => groups.setForm((f: any) => ({ ...f, start_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="End Date">
            <StyledInput value={groups.form.end_date ?? ''} onChangeText={(v) => groups.setForm((f: any) => ({ ...f, end_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Description">
            <StyledInput value={groups.form.description ?? ''} onChangeText={(v) => groups.setForm((f: any) => ({ ...f, description: v }))} multiline numberOfLines={3} />
          </FormField>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.gray[700] }}>Published</Text>
            <Switch value={!!groups.form.is_published} onValueChange={(v) => groups.setForm((f: any) => ({ ...f, is_published: v }))} trackColor={{ true: COLORS.primary }} />
          </View>
        </FormModal>
      )}

      {/* ── Exams modal ── */}
      {activeTab === 'exams' && (
        <FormModal visible={exams.showModal} title={exams.editingId ? 'Edit Exam' : 'New Exam'} onClose={() => exams.setShowModal(false)} onSave={exams.save} saving={exams.saving}>
          <FormField label="Exam Name" required>
            <StyledInput value={exams.form.name ?? ''} onChangeText={(v) => exams.setForm((f: any) => ({ ...f, name: v }))} placeholder="Exam name" />
          </FormField>
          <FormField label="Exam Type">
            <SimpleSelect options={EXAM_TYPES} value={exams.form.exam_type ?? 'written'} onChange={(v) => exams.setForm((f: any) => ({ ...f, exam_type: v }))} />
          </FormField>
          <FormField label="Max Marks">
            <StyledInput value={String(exams.form.max_marks ?? '')} onChangeText={(v) => exams.setForm((f: any) => ({ ...f, max_marks: v }))} keyboardType="numeric" placeholder="100" />
          </FormField>
          <FormField label="Pass Marks">
            <StyledInput value={String(exams.form.pass_marks ?? '')} onChangeText={(v) => exams.setForm((f: any) => ({ ...f, pass_marks: v }))} keyboardType="numeric" placeholder="35" />
          </FormField>
          <FormField label="Start Date">
            <StyledInput value={exams.form.start_date ?? ''} onChangeText={(v) => exams.setForm((f: any) => ({ ...f, start_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="End Date">
            <StyledInput value={exams.form.end_date ?? ''} onChangeText={(v) => exams.setForm((f: any) => ({ ...f, end_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
        </FormModal>
      )}

      {/* ── Schedules modal ── */}
      {activeTab === 'schedules' && (
        <FormModal visible={schedules.showModal} title={schedules.editingId ? 'Edit Schedule' : 'New Schedule'} onClose={() => schedules.setShowModal(false)} onSave={schedules.save} saving={schedules.saving}>
          <FormField label="Exam Date" required>
            <StyledInput value={schedules.form.exam_date ?? ''} onChangeText={(v) => schedules.setForm((f: any) => ({ ...f, exam_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Start Time">
            <StyledInput value={schedules.form.start_time ?? ''} onChangeText={(v) => schedules.setForm((f: any) => ({ ...f, start_time: v }))} placeholder="HH:MM" />
          </FormField>
          <FormField label="End Time">
            <StyledInput value={schedules.form.end_time ?? ''} onChangeText={(v) => schedules.setForm((f: any) => ({ ...f, end_time: v }))} placeholder="HH:MM" />
          </FormField>
          <FormField label="Venue / Room">
            <StyledInput value={schedules.form.venue ?? ''} onChangeText={(v) => schedules.setForm((f: any) => ({ ...f, venue: v }))} placeholder="Room / Hall" />
          </FormField>
        </FormModal>
      )}
    </View>
  );
}
