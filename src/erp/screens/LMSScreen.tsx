/**
 * LMS Screen (Learning Management System)
 * Sub-tabs: Assignments | Submissions
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Alert, RefreshControl } from 'react-native';
import {
  assignmentsApi,
  submissionsApi,
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

const ASSIGNMENT_STATUSES = ['draft', 'published', 'closed'].map((s) => ({ label: s, value: s }));
const SUBMISSION_STATUSES = ['submitted', 'graded', 'late', 'missing'].map((s) => ({ label: s, value: s }));

const TABS = [
  { key: 'assignments', label: 'Assignments' },
  { key: 'submissions', label: 'Submissions' },
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

export default function LMSScreen() {
  const { schoolId, isAdmin, isTeacher } = useErpRole();
  const { selectedYearId } = useAcademicYear();
  const [activeTab, setActiveTab] = useState('assignments');
  const baseParams = {
    ...(schoolId ? { school_id: schoolId } : {}),
    ...(selectedYearId ? { academic_year_id: selectedYearId } : {}),
  };

  const assignments = useCrud(assignmentsApi, baseParams);
  const submissions = useCrud(submissionsApi, baseParams);

  useEffect(() => {
    if (activeTab === 'assignments') assignments.load(1);
    else if (activeTab === 'submissions') submissions.load(1);
  }, [activeTab]);

  const section = activeTab === 'assignments' ? assignments : submissions;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.gray[50] }}>
      <SubTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <SearchBar value={section.search} onChangeText={section.setSearch} />

      <ScrollView
        refreshControl={<RefreshControl refreshing={section.refreshing} onRefresh={() => { section.setRefreshing(true); section.load(section.page); }} />}
      >
        <SectionHeader
          title={`${section.total} Records`}
          onAdd={(isAdmin || isTeacher) && activeTab === 'assignments' ? section.openAdd : undefined}
        />
        {section.loading ? <LoadingState /> : section.items.length === 0 ? <EmptyState /> : (
          section.items.map((item: any) => (
            <ListRow
              key={item.id}
              title={item.title ?? item.assignment_title ?? `#${item.id}`}
              subtitle={[
                item.subject_name ?? item.course_name,
                item.due_date ? `Due: ${item.due_date}` : undefined,
                item.class_name,
                item.student_name,
              ].filter(Boolean).join(' · ')}
              rightComponent={item.status ? <StatusBadge status={item.status} /> : undefined}
              onEdit={(isAdmin || isTeacher) && activeTab === 'assignments' ? () => section.openEdit(item) : undefined}
              onDelete={(isAdmin || isTeacher) && activeTab === 'assignments' ? () => section.remove(item.id) : undefined}
            />
          ))
        )}
        <Pagination page={section.page} total={section.total} perPage={PER_PAGE} onPrev={() => section.load(section.page - 1)} onNext={() => section.load(section.page + 1)} />
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Assignment modal ── */}
      {activeTab === 'assignments' && (
        <FormModal visible={assignments.showModal} title={assignments.editingId ? 'Edit Assignment' : 'New Assignment'} onClose={() => assignments.setShowModal(false)} onSave={assignments.save} saving={assignments.saving}>
          <FormField label="Title" required>
            <StyledInput value={assignments.form.title ?? ''} onChangeText={(v) => assignments.setForm((f: any) => ({ ...f, title: v }))} placeholder="Assignment title" />
          </FormField>
          <FormField label="Description">
            <StyledInput value={assignments.form.description ?? ''} onChangeText={(v) => assignments.setForm((f: any) => ({ ...f, description: v }))} multiline numberOfLines={4} placeholder="Details and instructions" />
          </FormField>
          <FormField label="Due Date">
            <StyledInput value={assignments.form.due_date ?? ''} onChangeText={(v) => assignments.setForm((f: any) => ({ ...f, due_date: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Max Marks">
            <StyledInput value={String(assignments.form.max_marks ?? '')} onChangeText={(v) => assignments.setForm((f: any) => ({ ...f, max_marks: v }))} keyboardType="numeric" placeholder="100" />
          </FormField>
          <FormField label="Status">
            <SimpleSelect options={ASSIGNMENT_STATUSES} value={assignments.form.status ?? 'draft'} onChange={(v) => assignments.setForm((f: any) => ({ ...f, status: v }))} />
          </FormField>
        </FormModal>
      )}

      {/* ── Submission modal ── */}
      {activeTab === 'submissions' && (
        <FormModal visible={submissions.showModal} title={submissions.editingId ? 'Edit Submission' : 'New Submission'} onClose={() => submissions.setShowModal(false)} onSave={submissions.save} saving={submissions.saving}>
          <FormField label="Marks Obtained">
            <StyledInput value={String(submissions.form.marks_obtained ?? '')} onChangeText={(v) => submissions.setForm((f: any) => ({ ...f, marks_obtained: v }))} keyboardType="numeric" placeholder="0" />
          </FormField>
          <FormField label="Status">
            <SimpleSelect options={SUBMISSION_STATUSES} value={submissions.form.status ?? 'submitted'} onChange={(v) => submissions.setForm((f: any) => ({ ...f, status: v }))} />
          </FormField>
          <FormField label="Feedback">
            <StyledInput value={submissions.form.feedback ?? ''} onChangeText={(v) => submissions.setForm((f: any) => ({ ...f, feedback: v }))} multiline numberOfLines={3} placeholder="Teacher feedback" />
          </FormField>
        </FormModal>
      )}
    </View>
  );
}
