/**
 * Form Builder hub — web FormBuilderTab parity.
 * Tabs: Templates | Responses
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  Badge,
  EmptyState,
  PrimaryButton,
  FormField,
  TextField,
  SelectField,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import {
  useAdminFormsData,
  type AdminFormsTab,
  type FormTemplateRow,
  type FormResponseRow,
} from '../../../hooks/useAdminFormsData';
import {
  TEMPLATE_TYPES,
  TEMPLATE_STATUSES,
  RESPONSE_STATUSES,
  templateStatusAccent,
  responseStatusAccent,
} from '../../../utils/formBuilderMeta';

const FORMS_TABS: Array<{ key: AdminFormsTab; title: string; subtitle: string }> = [
  {
    key: 'templates',
    title: 'Templates',
    subtitle: 'Design and publish form templates.',
  },
  {
    key: 'responses',
    title: 'Responses',
    subtitle: 'Review and manage submitted responses.',
  },
];

function CompactBtn({
  label,
  onPress,
  outline,
  icon,
  danger,
}: {
  label: string;
  onPress: () => void;
  outline?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  danger?: boolean;
}) {
  const theme = useTeacherTheme();
  const border = danger ? theme.colors.danger : theme.colors.primary;
  const bg = outline ? theme.colors.surface : danger ? theme.colors.danger : theme.colors.primary;
  const fg = outline ? border : theme.colors.textInverse;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.compactBtn, { backgroundColor: bg, borderColor: border }]}
    >
      {icon ? <Ionicons name={icon} size={16} color={fg} /> : null}
      <Text style={{ fontSize: 13, fontWeight: '700', color: fg }}>{label}</Text>
    </TouchableOpacity>
  );
}

function PageRow({
  page,
  pages,
  total,
  onPrev,
  onNext,
  showWhenSingle,
}: {
  page: number;
  pages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  showWhenSingle?: boolean;
}) {
  const theme = useTeacherTheme();
  if (total <= 0) return null;
  if (!showWhenSingle && pages <= 1) return null;
  return (
    <View style={styles.pageRow}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, flex: 1 }}>
        Page {page}/{pages}
        {total != null ? ` (${total})` : ''}
      </Text>
      <CompactBtn label="Prev" outline onPress={onPrev} />
      <CompactBtn label="Next" outline onPress={onNext} />
    </View>
  );
}

export default function FormsDashboardScreen() {
  const theme = useTeacherTheme();
  const forms = useAdminFormsData();
  const [tab, setTab] = useState<AdminFormsTab>('templates');

  const [templateModal, setTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FormTemplateRow | null>(null);
  const [templateForm, setTemplateForm] = useState({
    title: '',
    description: '',
    formType: 'survey',
    fieldsText: '[]',
    settingsText: '{}',
    status: 'draft',
    startDate: '',
    endDate: '',
  });

  const [responseModal, setResponseModal] = useState(false);
  const [editingResponse, setEditingResponse] = useState<FormResponseRow | null>(null);
  const [responseForm, setResponseForm] = useState({
    templateId: '',
    respondentId: '',
    answersText: '{}',
    status: 'submitted',
    score: '',
    reviewerNotes: '',
  });

  const openTemplateCreate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      title: '',
      description: '',
      formType: 'survey',
      fieldsText: '[]',
      settingsText: '{}',
      status: 'draft',
      startDate: '',
      endDate: '',
    });
    setTemplateModal(true);
  };

  const openTemplateEdit = (item: FormTemplateRow) => {
    setEditingTemplate(item);
    setTemplateForm({
      title: item.title,
      description: item.description,
      formType: item.formType || 'survey',
      fieldsText: JSON.stringify(item.fields ?? [], null, 2),
      settingsText: JSON.stringify(item.settings ?? {}, null, 2),
      status: item.status || 'draft',
      startDate: item.startDate,
      endDate: item.endDate,
    });
    setTemplateModal(true);
  };

  const openResponseCreate = () => {
    setEditingResponse(null);
    setResponseForm({
      templateId: '',
      respondentId: '',
      answersText: '{}',
      status: 'submitted',
      score: '',
      reviewerNotes: '',
    });
    setResponseModal(true);
  };

  const openResponseEdit = (item: FormResponseRow) => {
    setEditingResponse(item);
    setResponseForm({
      templateId: item.formId ? String(item.formId) : '',
      respondentId: item.respondentId != null ? String(item.respondentId) : '',
      answersText: JSON.stringify(item.answers ?? {}, null, 2),
      status: item.status || 'submitted',
      score: item.score != null ? String(item.score) : '',
      reviewerNotes: item.reviewerNotes,
    });
    setResponseModal(true);
  };

  const confirmDeactivate = (label: string, onOk: () => void) => {
    Alert.alert('Deactivate?', `Deactivate this ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: onOk },
    ]);
  };

  const typeOpts = [
    { label: 'All Types', value: '' },
    ...TEMPLATE_TYPES.map((t) => ({ label: t, value: t })),
  ];
  const templateStatusOpts = [
    { label: 'All Statuses', value: '' },
    ...TEMPLATE_STATUSES.map((s) => ({ label: s, value: s })),
  ];
  const responseStatusOpts = [
    { label: 'All Statuses', value: '' },
    ...RESPONSE_STATUSES.map((s) => ({ label: s, value: s })),
  ];

  return (
    <TeacherScreen
      header={
        <ScreenHeader
          title="Form Builder"
          trailingIcon="refresh-outline"
          onTrailingPress={() => void forms.refetch()}
        />
      }
      contentStyle={styles.content}
    >
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' }}>
        Data Collection
      </Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
        Create form templates and review submitted responses.
      </Text>

      {forms.status === 'loading' ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 12 }} />
      ) : null}
      {forms.error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{forms.error}</Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRail}
      >
        {FORMS_TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              activeOpacity={0.88}
              style={[
                styles.tabCard,
                theme.shadow.light,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabTitle,
                  { color: active ? theme.colors.textInverse : theme.colors.textPrimary },
                ]}
                numberOfLines={1}
              >
                {t.title}
              </Text>
              <Text
                style={[
                  styles.tabSub,
                  {
                    color: active ? 'rgba(255,255,255,0.82)' : theme.colors.textSecondary,
                  },
                ]}
                numberOfLines={2}
              >
                {t.subtitle}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Templates */}
      {tab === 'templates' ? (
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={{ flex: 1, minWidth: 140 }}>
              <SelectField
                options={typeOpts}
                value={forms.typeFilter}
                onChange={(v) => forms.setTypeFilter(v)}
                placeholder="All Types"
              />
            </View>
            <View style={{ flex: 1, minWidth: 140 }}>
              <SelectField
                options={templateStatusOpts}
                value={forms.templateStatusFilter}
                onChange={(v) => forms.setTemplateStatusFilter(v)}
                placeholder="All Statuses"
              />
            </View>
          </View>
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {forms.templateTotal} template{forms.templateTotal === 1 ? '' : 's'}
            </Text>
            <CompactBtn label="Create Template" icon="add" onPress={openTemplateCreate} />
          </View>
          {forms.templates.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="No templates"
              message="Create a form template to collect responses."
            />
          ) : (
            forms.templates.map((item) => (
              <SurfaceCard key={item.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {item.title}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      ID {item.id} · Responses {item.responseCount}
                    </Text>
                    <View style={styles.row}>
                      <Badge label={item.formType} accent="blue" />
                      <Badge
                        label={item.status}
                        accent={templateStatusAccent(item.status)}
                      />
                    </View>
                  </View>
                  <View style={{ gap: 6 }}>
                    <CompactBtn label="Edit" outline onPress={() => openTemplateEdit(item)} />
                    {item.isActive ? (
                      <CompactBtn
                        label="Deactivate"
                        outline
                        danger
                        onPress={() =>
                          confirmDeactivate('template', () => {
                            void forms.removeTemplate(item.id);
                          })
                        }
                      />
                    ) : null}
                  </View>
                </View>
              </SurfaceCard>
            ))
          )}
          <PageRow
            page={forms.templatePage}
            pages={forms.templatePages}
            total={forms.templateTotal}
            onPrev={() => forms.setTemplatePage(Math.max(1, forms.templatePage - 1))}
            onNext={() =>
              forms.setTemplatePage(Math.min(forms.templatePages, forms.templatePage + 1))
            }
          />
        </View>
      ) : null}

      {/* Responses */}
      {tab === 'responses' ? (
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={{ flex: 1, minWidth: 120 }}>
              <TextField
                value={forms.templateIdFilter}
                onChangeText={(v) => forms.setTemplateIdFilter(v)}
                placeholder="Template ID"
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1, minWidth: 140 }}>
              <SelectField
                options={responseStatusOpts}
                value={forms.responseStatusFilter}
                onChange={(v) => forms.setResponseStatusFilter(v)}
                placeholder="All Statuses"
              />
            </View>
          </View>
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {forms.responseTotal} response{forms.responseTotal === 1 ? '' : 's'}
            </Text>
            <CompactBtn label="Add Response" icon="add" onPress={openResponseCreate} />
          </View>
          {forms.responses.length === 0 ? (
            <EmptyState
              icon="chatbubbles-outline"
              title="No responses"
              message="Submitted form responses will appear here."
            />
          ) : (
            forms.responses.map((item) => (
              <SurfaceCard key={item.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      Template #{item.formId}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      ID {item.id} · Respondent {item.respondentId ?? '—'} ·{' '}
                      {item.submittedAt || '—'}
                    </Text>
                    <View style={styles.row}>
                      <Badge
                        label={item.status || '—'}
                        accent={responseStatusAccent(item.status)}
                      />
                    </View>
                  </View>
                  <View style={{ gap: 6 }}>
                    <CompactBtn label="Edit" outline onPress={() => openResponseEdit(item)} />
                    {item.isActive ? (
                      <CompactBtn
                        label="Deactivate"
                        outline
                        danger
                        onPress={() =>
                          confirmDeactivate('response', () => {
                            void forms.removeResponse(item.id);
                          })
                        }
                      />
                    ) : null}
                  </View>
                </View>
              </SurfaceCard>
            ))
          )}
          <PageRow
            page={forms.responsePage}
            pages={forms.responsePages}
            total={forms.responseTotal}
            onPrev={() => forms.setResponsePage(Math.max(1, forms.responsePage - 1))}
            onNext={() =>
              forms.setResponsePage(Math.min(forms.responsePages, forms.responsePage + 1))
            }
          />
        </View>
      ) : null}

      {/* Create / Edit Template modal */}
      <Modal
        visible={templateModal}
        animationType="slide"
        onRequestClose={() => setTemplateModal(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingTemplate ? 'Edit Template' : 'Create Template'}
            </Text>
            <TouchableOpacity onPress={() => setTemplateModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="Title" required>
              <TextField
                value={templateForm.title}
                onChangeText={(v) => setTemplateForm((f) => ({ ...f, title: v }))}
              />
            </FormField>
            <FormField label="Description">
              <TextField
                value={templateForm.description}
                onChangeText={(v) => setTemplateForm((f) => ({ ...f, description: v }))}
                multiline
              />
            </FormField>
            <FormField label="Type">
              <SelectField
                options={TEMPLATE_TYPES.map((t) => ({ label: t, value: t }))}
                value={templateForm.formType}
                onChange={(v) => setTemplateForm((f) => ({ ...f, formType: v }))}
              />
            </FormField>
            <FormField label="Fields (JSON array)">
              <TextField
                value={templateForm.fieldsText}
                onChangeText={(v) => setTemplateForm((f) => ({ ...f, fieldsText: v }))}
                multiline
                placeholder="[]"
              />
            </FormField>
            <FormField label="Settings (JSON object)">
              <TextField
                value={templateForm.settingsText}
                onChangeText={(v) => setTemplateForm((f) => ({ ...f, settingsText: v }))}
                multiline
                placeholder="{}"
              />
            </FormField>
            <FormField label="Status">
              <SelectField
                options={TEMPLATE_STATUSES.map((s) => ({ label: s, value: s }))}
                value={templateForm.status}
                onChange={(v) => setTemplateForm((f) => ({ ...f, status: v }))}
              />
            </FormField>
            <FormField label="Start Date">
              <TextField
                value={templateForm.startDate}
                onChangeText={(v) => setTemplateForm((f) => ({ ...f, startDate: v }))}
                placeholder="YYYY-MM-DD"
              />
            </FormField>
            <FormField label="End Date">
              <TextField
                value={templateForm.endDate}
                onChangeText={(v) => setTemplateForm((f) => ({ ...f, endDate: v }))}
                placeholder="YYYY-MM-DD"
              />
            </FormField>
            <PrimaryButton
              label={forms.busy ? 'Saving…' : 'Save'}
              disabled={forms.busy}
              onPress={() => {
                if (!templateForm.title.trim()) {
                  Alert.alert('Required', 'Title required');
                  return;
                }
                void (async () => {
                  const ok = await forms.saveTemplate(
                    {
                      title: templateForm.title,
                      description: templateForm.description,
                      formType: templateForm.formType,
                      fieldsText: templateForm.fieldsText,
                      settingsText: templateForm.settingsText,
                      status: templateForm.status,
                      startDate: templateForm.startDate,
                      endDate: templateForm.endDate,
                    },
                    editingTemplate?.id,
                  );
                  if (ok) setTemplateModal(false);
                  else Alert.alert('Save failed', forms.error || 'Could not save');
                })();
              }}
            />
            <PrimaryButton
              label="Cancel"
              variant="outline"
              onPress={() => setTemplateModal(false)}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Add / Edit Response modal */}
      <Modal
        visible={responseModal}
        animationType="slide"
        onRequestClose={() => setResponseModal(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingResponse ? 'Edit Response' : 'Add Response'}
            </Text>
            <TouchableOpacity onPress={() => setResponseModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="Template ID" required>
              <TextField
                value={responseForm.templateId}
                onChangeText={(v) => setResponseForm((f) => ({ ...f, templateId: v }))}
                keyboardType="numeric"
              />
            </FormField>
            <FormField label="Respondent ID" required>
              <TextField
                value={responseForm.respondentId}
                onChangeText={(v) => setResponseForm((f) => ({ ...f, respondentId: v }))}
                keyboardType="numeric"
              />
            </FormField>
            <FormField label="Answers (JSON)">
              <TextField
                value={responseForm.answersText}
                onChangeText={(v) => setResponseForm((f) => ({ ...f, answersText: v }))}
                multiline
                placeholder="{}"
              />
            </FormField>
            {editingResponse ? (
              <>
                <FormField label="Status">
                  <SelectField
                    options={RESPONSE_STATUSES.map((s) => ({ label: s, value: s }))}
                    value={responseForm.status}
                    onChange={(v) => setResponseForm((f) => ({ ...f, status: v }))}
                  />
                </FormField>
                <FormField label="Score">
                  <TextField
                    value={responseForm.score}
                    onChangeText={(v) => setResponseForm((f) => ({ ...f, score: v }))}
                    keyboardType="decimal-pad"
                  />
                </FormField>
                <FormField label="Reviewer Notes">
                  <TextField
                    value={responseForm.reviewerNotes}
                    onChangeText={(v) =>
                      setResponseForm((f) => ({ ...f, reviewerNotes: v }))
                    }
                    multiline
                  />
                </FormField>
              </>
            ) : null}
            <PrimaryButton
              label={forms.busy ? 'Saving…' : 'Save'}
              disabled={forms.busy}
              onPress={() => {
                if (!responseForm.templateId.trim() || !responseForm.respondentId.trim()) {
                  Alert.alert('Required', 'Template & respondent IDs required');
                  return;
                }
                void (async () => {
                  const ok = await forms.saveResponse(
                    {
                      templateId: responseForm.templateId,
                      respondentId: responseForm.respondentId,
                      answersText: responseForm.answersText,
                      status: responseForm.status,
                      score: responseForm.score,
                      reviewerNotes: responseForm.reviewerNotes,
                    },
                    editingResponse?.id,
                  );
                  if (ok) setResponseModal(false);
                  else Alert.alert('Save failed', forms.error || 'Could not save');
                })();
              }}
            />
            <PrimaryButton
              label="Cancel"
              variant="outline"
              onPress={() => setResponseModal(false)}
            />
          </ScrollView>
        </View>
      </Modal>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14, paddingBottom: 32 },
  tabRail: { gap: 10, paddingRight: 8, paddingVertical: 2 },
  tabCard: {
    width: 168,
    minHeight: 78,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  tabTitle: { fontSize: 14, fontWeight: '700' },
  tabSub: { fontSize: 11, lineHeight: 15, marginTop: 4 },
  section: { gap: 12 },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  listRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  rowName: { fontSize: 15, fontWeight: '700' },
  compactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  pageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  modalRoot: { flex: 1, paddingTop: 48 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalBody: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
});
