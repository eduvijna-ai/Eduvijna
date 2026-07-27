/**
 * Create / Edit Library Transaction — web LibraryTab New Transaction modal parity.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  FormField,
  TextField,
  SelectField,
  PrimaryButton,
  ScreenLoader,
} from '../../components';
import { useTeacherTheme } from '../../theme/useTeacherTheme';
import { useLibraryData } from '../../hooks/useLibraryData';
import { MEMBER_TYPES, TX_STATUSES } from '../../utils/libraryMeta';
import { toLocalDateStr } from '../../utils/apiHelpers';

type Params = { CreateLibraryTransaction: { transactionId?: number } };
type Nav = NativeStackNavigationProp<Params>;

export default function CreateLibraryTransactionScreen() {
  const theme = useTeacherTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<Params, 'CreateLibraryTransaction'>>();
  const lib = useLibraryData();

  const editingId = route.params?.transactionId;
  const isEdit = editingId != null && editingId > 0;

  const [loading, setLoading] = useState(Boolean(isEdit));
  const [bookId, setBookId] = useState('');
  const [memberType, setMemberType] = useState('student');
  const [memberId, setMemberId] = useState('');
  const [status, setStatus] = useState('issued');
  const [issueDate, setIssueDate] = useState(toLocalDateStr());
  const [dueDate, setDueDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [fineAmount, setFineAmount] = useState('0');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (!isEdit || !editingId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const tx = await lib.getTransaction(editingId);
      if (cancelled) return;
      if (tx) {
        setBookId(String(tx.bookId || ''));
        setMemberType(tx.memberType || 'student');
        setMemberId(String(tx.memberId || ''));
        setStatus(tx.status || 'issued');
        setIssueDate(tx.issueDate || toLocalDateStr());
        setDueDate(tx.dueDate || '');
        setReturnDate(tx.returnDate || '');
        setFineAmount(String(tx.fineAmount ?? 0));
        setRemarks(tx.remarks || '');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, editingId, lib.getTransaction]);

  const bookOptions = useMemo(() => {
    const current = bookId ? Number(bookId) : null;
    const source = isEdit
      ? lib.catalogBooks
      : lib.catalogBooks.filter((b) => b.availableCopies > 0 || b.bookId === current);
    const list =
      isEdit && current && !source.some((b) => b.bookId === current)
        ? [
            {
              bookId: current,
              title: lib.bookLabel(current),
              author: '',
              availableCopies: 0,
              totalCopies: 0,
            },
            ...source,
          ]
        : source;
    return list.map((b) => ({
      label: `${b.title}${b.author ? ` — ${b.author}` : ''} (${b.availableCopies}/${b.totalCopies} available)`,
      value: String(b.bookId),
    }));
  }, [lib.catalogBooks, lib.bookLabel, bookId, isEdit]);

  const memberOptions = useMemo(() => {
    const list = memberType === 'staff' ? lib.staffMembers : lib.studentMembers;
    return list.map((m) => ({ label: m.label, value: String(m.id) }));
  }, [memberType, lib.staffMembers, lib.studentMembers]);

  const onSave = async () => {
    if (!bookId || !memberId) {
      Alert.alert('Required', 'Book and Member are required.');
      return;
    }
    const payload = {
      book_id: Number(bookId),
      member_id: Number(memberId),
      member_type: memberType,
      status,
      issue_date: issueDate || toLocalDateStr(),
      due_date: dueDate || undefined,
      return_date: returnDate || null,
      fine_amount: Number(fineAmount) || 0,
      remarks: remarks.trim() || null,
    };
    const ok = isEdit
      ? await lib.updateTransaction(editingId!, payload)
      : await lib.createTransaction(payload);
    if (!ok) {
      Alert.alert('Save failed', lib.error || 'Could not save transaction.');
      return;
    }
    navigation.goBack();
  };

  if (loading) {
    return (
      <TeacherScreen
        header={
          <ScreenHeader title={isEdit ? 'Edit Transaction' : 'New Transaction'} />
        }
      >
        <ScreenLoader message="Loading transaction…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={
        <ScreenHeader title={isEdit ? 'Edit Transaction' : 'New Transaction'} />
      }
      contentStyle={styles.content}
      footer={
        <View style={styles.footerRow}>
          <PrimaryButton
            label="Cancel"
            variant="outline"
            onPress={() => navigation.goBack()}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label={lib.saving ? 'Saving…' : 'Save'}
            icon="checkmark-outline"
            disabled={lib.saving}
            onPress={() => void onSave()}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <SurfaceCard>
        <View style={styles.form}>
          <FormField label="Book" required>
            <SelectField
              options={bookOptions}
              value={bookId || null}
              onChange={setBookId}
              placeholder={
                bookOptions.length === 0
                  ? 'No books with available copies'
                  : 'Select book…'
              }
            />
          </FormField>
          {!isEdit && bookOptions.length === 0 ? (
            <Text style={{ color: theme.colors.danger, fontSize: 12 }}>
              No books with available copies. Add copies in the Books tab first.
            </Text>
          ) : null}

          <FormField label="Member Type">
            <SelectField
              options={MEMBER_TYPES.map((t) => ({ label: t, value: t }))}
              value={memberType}
              onChange={(v) => {
                if (isEdit) return;
                setMemberType(v);
                setMemberId('');
              }}
            />
          </FormField>

          <FormField label="Member" required>
            <SelectField
              options={memberOptions}
              value={memberId || null}
              onChange={setMemberId}
              placeholder="Select member…"
            />
          </FormField>
          {memberType === 'student' && !lib.academicYearId ? (
            <Text style={{ color: theme.colors.danger, fontSize: 12 }}>
              Select an academic year to load students.
            </Text>
          ) : null}

          <FormField label="Status">
            <SelectField
              options={TX_STATUSES.map((s) => ({ label: s, value: s }))}
              value={status}
              onChange={setStatus}
            />
          </FormField>

          <FormField label="Issue Date">
            <TextField
              value={issueDate}
              onChangeText={setIssueDate}
              placeholder="YYYY-MM-DD"
              editable={!isEdit}
            />
          </FormField>
          <FormField label="Due Date">
            <TextField
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
            />
          </FormField>
          <FormField label="Return Date">
            <TextField
              value={returnDate}
              onChangeText={setReturnDate}
              placeholder="YYYY-MM-DD"
            />
          </FormField>
          <FormField label="Fine Amount">
            <TextField
              value={fineAmount}
              onChangeText={setFineAmount}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          </FormField>
          <FormField label="Remarks">
            <TextField
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Optional remarks…"
              multiline
            />
          </FormField>
        </View>
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12, paddingBottom: 24 },
  form: { gap: 4 },
  footerRow: { flexDirection: 'row', gap: 10 },
});
